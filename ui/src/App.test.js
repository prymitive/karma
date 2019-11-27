import React from "react";

import { shallow, mount } from "enzyme";

import { NewUnappliedFilter } from "Stores/AlertStore";
import { App } from "./App";

const uiDefaults = {
  Refresh: 30 * 1000 * 1000 * 1000,
  HideFiltersWhenIdle: true,
  ColorTitlebar: false,
  MinimalGroupWidth: 420,
  AlertsPerGroup: 5,
  CollapseGroups: "collapsedOnMobile"
};

beforeEach(() => {
  // createing App instance will push current filters into window.location
  // ensure it's wiped after each test
  window.history.pushState({}, "App", "/");

  document.body.className = "";
});

afterEach(() => {
  localStorage.setItem("savedFilters", "");
  jest.restoreAllMocks();
  window.history.pushState({}, "App", "/");
  document.body.className = "";
});

describe("<App />", () => {
  it("uses passed default filters if there's no query args or saved filters", () => {
    expect(window.location.search).toBe("");
    const tree = shallow(
      <App defaultFilters={["foo=bar"]} uiDefaults={uiDefaults} />
    );
    const instance = tree.instance();
    expect(instance.alertStore.filters.values).toHaveLength(1);
    expect(instance.alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("foo=bar")
    );
  });

  it("uses saved filters if there's no query args (ignoring passed defaults)", () => {
    expect(window.location.search).toBe("");
    localStorage.setItem(
      "savedFilters",
      JSON.stringify({
        filters: ["bar=baz", "abc!=cba"],
        present: true
      })
    );

    // https://github.com/facebook/jest/issues/6798#issuecomment-412871616
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem");

    const tree = shallow(
      <App defaultFilters={["ignore=defaults"]} uiDefaults={uiDefaults} />
    );
    const instance = tree.instance();

    expect(getItemSpy).toHaveBeenCalledWith("savedFilters");

    expect(instance.alertStore.filters.values).toHaveLength(2);
    expect(instance.alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("bar=baz")
    );
    expect(instance.alertStore.filters.values[1]).toMatchObject(
      NewUnappliedFilter("abc!=cba")
    );

    getItemSpy.mockRestore();
  });

  it("ignores saved filters if 'present' key is falsey (use passed defaults)", () => {
    expect(window.location.search).toBe("");
    localStorage.setItem(
      "savedFilters",
      JSON.stringify({
        filters: ["ignore=saved"],
        present: false
      })
    );

    // https://github.com/facebook/jest/issues/6798#issuecomment-412871616
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem");

    const tree = shallow(
      <App defaultFilters={["use=defaults"]} uiDefaults={uiDefaults} />
    );
    const instance = tree.instance();

    expect(getItemSpy).toHaveBeenCalledWith("savedFilters");

    expect(instance.alertStore.filters.values).toHaveLength(1);
    expect(instance.alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("use=defaults")
    );

    getItemSpy.mockRestore();
  });

  it("uses filters passed via ?q= query args (ignoring saved filters and passed defaults)", () => {
    expect(window.location.search).toBe("");
    localStorage.setItem(
      "savedFilters",
      JSON.stringify({
        filters: ["ignore=saved"],
        present: true
      })
    );

    window.history.pushState({}, "App", "/?q=use%3Dquery");

    const tree = shallow(
      <App defaultFilters={["ignore=defaults"]} uiDefaults={uiDefaults} />
    );
    const instance = tree.instance();

    expect(instance.alertStore.filters.values).toHaveLength(1);
    expect(instance.alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("use=query")
    );
  });

  it("popstate event updates alertStore filters", () => {
    const tree = shallow(
      <App defaultFilters={["foo"]} uiDefaults={uiDefaults} />
    );
    expect(tree.instance().alertStore.filters.values).toHaveLength(1);
    expect(tree.instance().alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("foo")
    );

    delete global.window.location;
    global.window.location = {
      href: "http://localhost/?q=bar",
      search: "?q=bar"
    };

    let event = new PopStateEvent("popstate");
    window.onpopstate(event);

    expect(tree.instance().alertStore.filters.values).toHaveLength(1);
    expect(tree.instance().alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("bar")
    );
  });

  it("unmounts without crashing", () => {
    const tree = shallow(
      <App defaultFilters={["foo=bar"]} uiDefaults={uiDefaults} />
    );
    tree.instance().componentWillUnmount();

    let event = new PopStateEvent("popstate");
    window.onpopstate(event);
  });

  it("appends correct theme class to #root if dark mode is disabled", () => {
    const tree = shallow(
      <App
        defaultFilters={["foo=bar"]}
        uiDefaults={Object.assign({}, uiDefaults, { DarkMode: false })}
      />
    );
    tree.instance().componentWillUnmount();

    expect(document.body.className.split(" ")).toContain("theme-light");
  });

  it("appends 'theme-dark' class to #root if dark mode is enabled", () => {
    const tree = shallow(
      <App
        defaultFilters={["foo=bar"]}
        uiDefaults={Object.assign({}, uiDefaults, { DarkMode: true })}
      />
    );
    tree.instance().componentWillUnmount();

    expect(document.body.className.split(" ")).toContain("theme-dark");
  });

  it("toggling settingsStore.themeConfig.config.darkTheme modifies the theme", () => {
    const tree = mount(
      <App
        defaultFilters={["foo=bar"]}
        uiDefaults={Object.assign({}, uiDefaults, { DarkMode: false })}
      />
    );
    tree.update();
    expect(document.body.className.split(" ")).toContain("theme-light");

    tree.instance().settingsStore.themeConfig.config.darkTheme = true;
    tree.update();
    expect(document.body.className.split(" ")).toContain("theme-dark");
    tree.instance().componentWillUnmount();
  });
});

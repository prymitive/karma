import React from "react";

import { shallow, mount } from "enzyme";

import { mockMatchMedia } from "__mocks__/matchMedia";
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

  // matchMedia needs mocking
  window.matchMedia = mockMatchMedia({});
});

afterEach(() => {
  localStorage.setItem("savedFilters", "");
  jest.restoreAllMocks();
  window.history.pushState({}, "App", "/");
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
});

describe("<App /> theme", () => {
  const getApp = theme =>
    mount(
      <App
        defaultFilters={["foo=bar"]}
        uiDefaults={Object.assign({}, uiDefaults, { Theme: theme })}
      />
    );

  it("configures light theme when uiDefaults passes it", () => {
    const tree = getApp("light");
    expect(tree.instance().settingsStore.themeConfig.config.theme).toBe(
      "light"
    );
    tree.instance().componentWillUnmount();
  });

  it("configures dark theme when uiDefaults passes it", () => {
    const tree = getApp("dark");
    expect(tree.instance().settingsStore.themeConfig.config.theme).toBe("dark");
    tree.instance().componentWillUnmount();
  });

  it("configures automatic theme when uiDefaults passes it", () => {
    const tree = getApp("auto");
    expect(tree.instance().settingsStore.themeConfig.config.theme).toBe("auto");
    tree.instance().componentWillUnmount();
  });

  it("configures automatic theme when uiDefaults doesn't pass any value", () => {
    const tree = mount(<App defaultFilters={["foo=bar"]} uiDefaults={null} />);
    expect(tree.instance().settingsStore.themeConfig.config.theme).toBe("auto");
    tree.instance().componentWillUnmount();
  });

  it("applies light theme when theme=auto and browser doesn't support prefers-color-scheme", () => {
    window.matchMedia = mockMatchMedia({});
    const tree = getApp("auto");
    expect(tree.find("LightTheme")).toHaveLength(1);
    tree.instance().componentWillUnmount();
  });

  const lightMatch = () => ({
    "(prefers-color-scheme)": {
      media: "(prefers-color-scheme)",
      matches: true
    },
    "(prefers-color-scheme: light)": {
      media: "(prefers-color-scheme: light)",
      matches: true
    },
    "(prefers-color-scheme: dark)": {
      media: "(prefers-color-scheme: dark)",
      matches: false
    }
  });

  const darkMatch = () => ({
    "(prefers-color-scheme)": {
      media: "(prefers-color-scheme)",
      matches: true
    },
    "(prefers-color-scheme: light)": {
      media: "(prefers-color-scheme: light)",
      matches: false
    },
    "(prefers-color-scheme: dark)": {
      media: "(prefers-color-scheme: dark)",
      matches: true
    }
  });

  const testCases = [
    {
      name:
        "applies LightTheme when config=auto and browser doesn't support prefers-color-scheme",
      settings: "auto",
      matchMedia: {},
      theme: "LightTheme"
    },
    {
      name:
        "applies LightTheme when config=auto and browser prefers-color-scheme:light matches",
      settings: "auto",
      matchMedia: lightMatch(),
      theme: "LightTheme"
    },
    {
      name:
        "applies DarkTheme when config=auto and browser prefers-color-scheme:dark matches",
      settings: "auto",
      matchMedia: darkMatch(),
      theme: "DarkTheme"
    },

    {
      name:
        "applies LightTheme when config=light and browser doesn't support prefers-color-scheme",
      settings: "light",
      matchMedia: {},
      theme: "LightTheme"
    },
    {
      name:
        "applies LightTheme when config=light and browser prefers-color-scheme:light matches",
      settings: "light",
      matchMedia: lightMatch(),
      theme: "LightTheme"
    },

    {
      name:
        "applies DarkTheme when config=dark and browser doesn't support prefers-color-scheme",
      settings: "dark",
      matchMedia: {},
      theme: "DarkTheme"
    },
    {
      name:
        "applies DarkTheme when config=dark and browser prefers-color-scheme:dark matches",
      settings: "dark",
      matchMedia: darkMatch(),
      theme: "DarkTheme"
    }
  ];
  for (const testCase of testCases) {
    it(testCase.name, () => {
      window.matchMedia = mockMatchMedia(testCase.matchMedia);
      const tree = getApp(testCase.settings);
      expect(tree.find(testCase.theme)).toHaveLength(1);
      tree.instance().componentWillUnmount();
      window.matchMedia.mockRestore();
    });
  }
});

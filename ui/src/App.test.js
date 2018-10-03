import React from "react";

import { shallow } from "enzyme";

import { NewUnappliedFilter } from "Stores/AlertStore";
import { App } from "./App";

beforeEach(() => {
  // createing App instance will push current filters into window.location
  // ensure it's wiped after each test
  window.history.pushState({}, "App", "/");
});

afterEach(() => {
  jest.restoreAllMocks();
  window.history.pushState({}, "App", "/");
});

describe("<App />", () => {
  it("uses passed default filters if there's no query args or saved filters", () => {
    expect(window.location.search).toBe("");
    const tree = shallow(<App defaultFilters={["foo=bar"]} />);
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

    const tree = shallow(<App defaultFilters={["ignore=defaults"]} />);
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

    const tree = shallow(<App defaultFilters={["use=defaults"]} />);
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

    const tree = shallow(<App defaultFilters={["ignore=defaults"]} />);
    const instance = tree.instance();

    expect(instance.alertStore.filters.values).toHaveLength(1);
    expect(instance.alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("use=query")
    );
  });
});

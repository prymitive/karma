import React from "react";
import { act } from "react-dom/test-utils";

import { mount, render } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { useFetchGet } from "Hooks/useFetchGet";
import { FilterInput } from ".";

let alertStore;
let settingsStore;
let originalInnerWidth;

beforeAll(() => {
  jest.useFakeTimers();
  originalInnerWidth = global.window.innerWidth;
});

beforeEach(() => {
  global.window.innerWidth = originalInnerWidth;
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
});

afterEach(() => {
  jest.restoreAllMocks();
  useFetchGet.mockReset();
  global.window.innerWidth = originalInnerWidth;
});

const MountedInput = () => {
  return mount(
    <FilterInput alertStore={alertStore} settingsStore={settingsStore} />
  );
};

describe("<FilterInput />", () => {
  it("matches snapshot on default render", () => {
    const tree = render(
      <FilterInput alertStore={alertStore} settingsStore={settingsStore} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("input gets focus by default on desktop", () => {
    global.window.innerWidth = 768;
    const tree = MountedInput();
    expect(tree.find("input:focus")).toHaveLength(1);
  });

  it("input doesn't get focus by default on mobile", () => {
    global.window.innerWidth = 767;
    const tree = MountedInput();
    expect(tree.find("input:focus")).toHaveLength(0);
  });

  it("onChange should modify inputStore.value", () => {
    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "foo=bar" } });
    act(() => jest.runOnlyPendingTimers());

    expect(
      tree.find("input.components-filterinput-wrapper").props().value
    ).toBe("foo=bar");
  });

  it("submit should modify alertStore.filters", () => {
    const tree = MountedInput();

    tree.find("input").simulate("change", { target: { value: "foo=bar" } });
    act(() => jest.runOnlyPendingTimers());

    expect(alertStore.filters.values).toHaveLength(0);
    tree.find("form").simulate("submit");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("foo=bar")
    );
  });

  it("submit should be no-op if input value is empty", () => {
    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "" } });
    act(() => jest.runOnlyPendingTimers());

    expect(alertStore.filters.values).toHaveLength(0);
    tree.find("form").simulate("submit");
    expect(alertStore.filters.values).toHaveLength(0);
  });

  it("clicking on form-control div focuses input", () => {
    const tree = MountedInput();
    const formControl = tree.find(".form-control");
    formControl.simulate("click");
    expect(tree.find("input:focus")).toHaveLength(1);
  });

  it("focusing input changes background color", () => {
    const tree = MountedInput();
    const formControl = tree.find(".form-control");
    formControl.find("input").simulate("focus");
    expect(toDiffableHtml(tree.html())).toMatch(/bg-focused/);
  });

  it("bluring input changes background color", () => {
    const tree = MountedInput();
    const formControl = tree.find(".form-control");
    formControl.find("input").simulate("blur");
    expect(toDiffableHtml(tree.html())).not.toMatch(/bg-focused/);
  });
});

describe("<FilterInput Autosuggest />", () => {
  it("fetches suggestions on input change", async () => {
    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "cluster" } });
    act(() => jest.runOnlyPendingTimers());

    expect(useFetchGet.fetch.calls).toHaveLength(1);
    expect(useFetchGet.fetch.calls[0]).toContain(
      "./autocomplete.json?term=cluster"
    );
  });

  it("doesn't fetch any suggestion if the input value is empty", () => {
    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "" } });
    act(() => jest.runOnlyPendingTimers());
    expect(useFetchGet.fetch.calls).toHaveLength(0);
  });

  it("clicking on a suggestion adds it to filters", async () => {
    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "cluster" } });
    act(() => jest.runOnlyPendingTimers());

    // suggestions are rendered only when input is focused
    tree.find("input").simulate("focus");

    // find() doesn't pick up suggestions even when tree.html() shows them
    // forcing update seems to solve it
    // https://github.com/airbnb/enzyme/issues/1233#issuecomment-343449560
    tree.update();
    // not sure why but suggestions are being found twice
    const suggestion = tree.find(".dropdown-item").at(2);
    expect(suggestion.text()).toBe("cluster=prod");
    suggestion.simulate("click");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0]).toMatchObject({
      raw: "cluster=prod",
    });
  });

  it("handles failed suggestion fetches", async () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
      get: jest.fn(),
    });

    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "cluster" } });
    act(() => jest.runOnlyPendingTimers());
  });
});

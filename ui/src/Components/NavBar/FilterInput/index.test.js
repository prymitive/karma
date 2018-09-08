import React from "react";

import { mount, render } from "enzyme";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { FilterInput } from ".";

let alertStore;
let settingsStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();

  fetch.resetMocks();
});

const MountedInput = () => {
  return mount(
    <FilterInput alertStore={alertStore} settingsStore={settingsStore} />
  );
};

const WaitForFetch = tree => {
  return expect(
    tree.instance().inputStore.suggestionsFetch
  ).resolves.toBeUndefined();
};

describe("<FilterInput />", () => {
  it("matches snapshot on default render", () => {
    const tree = render(
      <FilterInput alertStore={alertStore} settingsStore={settingsStore} />
    );
    expect(tree).toMatchSnapshot();
  });

  it("inputStore.ref should be  != null after mount", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    expect(instance.inputStore.ref).not.toBeNull();
  });

  it("onChange should modify inputStore.value", () => {
    fetch.mockResponseOnce(JSON.stringify([]));

    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "foo=bar" } });
    const instance = tree.instance();
    expect(instance.inputStore.value).toBe("foo=bar");
  });

  it("submit should modify alertStore.filters", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    instance.inputStore.value = "foo=bar";
    expect(alertStore.filters.values).toHaveLength(0);
    tree.find("form").simulate("submit");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0]).toMatchObject(
      NewUnappliedFilter("foo=bar")
    );
  });

  it("submit should be no-op if input value is empty", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    instance.inputStore.value = "";
    expect(alertStore.filters.values).toHaveLength(0);
    tree.find("form").simulate("submit");
    expect(alertStore.filters.values).toHaveLength(0);
  });

  it("clicking on form-control div focuses input", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    const inputSpy = jest.spyOn(instance.inputStore.ref.input, "focus");
    const formControl = tree.find(".form-control");
    formControl.simulate("click");
    expect(inputSpy).toHaveBeenCalledTimes(1);
  });

  it("clicking on a label doesn't trigger input focus", () => {
    alertStore.filters.values = [NewUnappliedFilter("foo=bar")];
    const tree = MountedInput();
    const instance = tree.instance();
    const inputSpy = jest.spyOn(instance.inputStore.ref.input, "focus");
    tree.find("FilterInputLabel").simulate("click");
    expect(inputSpy).not.toHaveBeenCalled();
  });

  it("componentDidMount executes even when inputStore.ref=null", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    instance.inputStore.ref = null;
    instance.componentDidMount();
  });
});

describe("<FilterInput Autosuggest />", () => {
  it("fetches suggestions on input change", async () => {
    fetch.mockResponseOnce(JSON.stringify(["foo=bar", "foo=~bar"]));

    const tree = MountedInput();
    const instance = tree.instance();
    tree.find("input").simulate("change", { target: { value: "foo" } });
    await WaitForFetch(tree);

    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0]).toContain("./autocomplete.json?term=foo");
    expect(instance.inputStore.suggestions).toHaveLength(2);
    expect(instance.inputStore.suggestions).toContain("foo=bar");
    expect(instance.inputStore.suggestions).toContain("foo=~bar");
  });

  it("doesn't fetch any suggestion if the input value is empty", () => {
    fetch.mockResponseOnce(JSON.stringify(["foo=bar", "foo=~bar"]));

    const tree = MountedInput();
    const instance = tree.instance();
    instance.onSuggestionsFetchRequested({ value: "" });
    expect(fetch.mock.calls).toHaveLength(0);
  });

  it("clicking on a suggestion adds it to filters", async () => {
    fetch.mockResponse(JSON.stringify(["foo=bar", "foo=~bar"]));

    const tree = MountedInput();
    tree.find("input").simulate("change", { target: { value: "foo" } });
    // suggestions are rendered only when input is focused
    tree.find("input").simulate("focus");
    await WaitForFetch(tree);

    // find() doesn't pick up suggestions even when tree.html() shows them
    // forcing update seems to solve it
    // https://github.com/airbnb/enzyme/issues/1233#issuecomment-343449560
    tree.update();
    // not sure why but suggestions are being found twice
    const suggestion = tree.find(".dropdown-item").at(2);
    expect(suggestion.text()).toBe("foo=~bar");
    suggestion.simulate("click");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values[0]).toMatchObject({ raw: "foo=~bar" });
  });

  it("handles failed suggestion fetches", async () => {
    fetch.mockRejectOnce("Fetch error");

    const tree = MountedInput();
    const instance = tree.instance();
    tree.find("input").simulate("change", { target: { value: "bar" } });
    await WaitForFetch(tree);

    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0]).toContain("./autocomplete.json?term=bar");
    expect(instance.inputStore.suggestions).toHaveLength(0);
  });

  it("handles invalid JSON in suggestion fetches", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetch.mockResponseOnce("this is not JSON");

    const tree = MountedInput();
    const instance = tree.instance();
    tree.find("input").simulate("change", { target: { value: "bar" } });
    await WaitForFetch(tree);

    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0]).toContain("./autocomplete.json?term=bar");
    expect(instance.inputStore.suggestions).toHaveLength(0);
  });

  it("clearing input clears suggestions", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    instance.inputStore.suggestions = ["foo", "bar"];
    tree.find("input").simulate("change", { target: { value: "" } });
    expect(instance.inputStore.suggestions).toHaveLength(0);
  });
});

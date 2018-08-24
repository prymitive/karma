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

  it("Clicking on form-control div focuses input", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    const inputSpy = jest.spyOn(instance.inputStore.ref.input, "focus");
    const formControl = tree.find(".form-control");
    formControl.simulate("click");
    expect(inputSpy).toHaveBeenCalledTimes(1);
  });
});

describe("<FilterInput Autosuggest />", () => {
  it("fetches suggestions on input change", done => {
    fetch.mockResponseOnce(JSON.stringify(["foo=bar", "foo=~bar"]));

    const tree = MountedInput();
    const instance = tree.instance();
    tree.find("input").simulate("change", { target: { value: "foo" } });

    // need to wait on fetch to resolve, but can't find any better way here
    setTimeout(() => {
      expect(fetch.mock.calls).toHaveLength(1);
      expect(fetch.mock.calls[0]).toContain("./autocomplete.json?term=foo");
      expect(instance.inputStore.suggestions).toHaveLength(2);
      expect(instance.inputStore.suggestions).toContain("foo=bar");
      expect(instance.inputStore.suggestions).toContain("foo=~bar");
      done();
    }, 1000);
  });

  it("handles failed suggestion fetches", done => {
    fetch.mockRejectOnce("Fetch error");

    const tree = MountedInput();
    const instance = tree.instance();
    tree.find("input").simulate("change", { target: { value: "bar" } });

    // need to wait on fetch to resolve, but can't find any better way here
    setTimeout(() => {
      expect(fetch.mock.calls).toHaveLength(1);
      expect(fetch.mock.calls[0]).toContain("./autocomplete.json?term=bar");
      expect(instance.inputStore.suggestions).toHaveLength(0);
      done();
    }, 1000);
  });

  it("clearing input clears suggestions", () => {
    const tree = MountedInput();
    const instance = tree.instance();
    instance.inputStore.suggestions = ["foo", "bar"];
    tree.find("input").simulate("change", { target: { value: "" } });
    expect(instance.inputStore.suggestions).toHaveLength(0);
  });
});

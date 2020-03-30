import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";
import { MultiGridConfiguration } from "./MultiGridConfiguration";

let settingsStore;
beforeEach(() => {
  fetch.mockResponse(JSON.stringify([]));
  settingsStore = new Settings();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const FakeConfiguration = () => {
  return mount(
    <ThemeContext.Provider
      value={{
        reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
      }}
    >
      <MultiGridConfiguration settingsStore={settingsStore} />
    </ThemeContext.Provider>
  );
};

const ExpandSortLabelSuggestions = async () => {
  settingsStore.gridConfig.config.sortOrder =
    settingsStore.gridConfig.options.label.value;
  const tree = FakeConfiguration();
  const labelSelect = tree.find("GridLabelName");
  await expect(
    labelSelect.instance().nameSuggestionsFetch
  ).resolves.toBeUndefined();

  tree
    .find("input#react-select-configuration-grid-label-input")
    .simulate("change", { target: { value: "a" } });

  fetch.resetMocks();
  return tree;
};

describe("<MultiGridConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("label select handles fetch errors", async () => {
    fetch.mockReject(new Error("Fetch error"));
    const tree = await ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(1);
    expect(options.text()).toBe("Disable multi-grid");
  });

  it("label select handles invalid JSON", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetch.mockResponse("invalid JSON");
    const tree = await ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(1);
    expect(options.text()).toBe("Disable multi-grid");
  });

  it("clicking on a label option updates settingsStore", async (done) => {
    fetch.mockResponse(JSON.stringify(["alertname", "cluster", "fakeLabel"]));
    const tree = await ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    options.at(2).simulate("click");
    setTimeout(() => {
      expect(settingsStore.multiGridConfig.config.gridLabel).toBe("cluster");
      done();
    }, 200);
  });

  it("clicking on the 'reverse' checkbox updates settingsStore", (done) => {
    settingsStore.gridConfig.config.reverseSort = false;
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-multigrid-sort-reverse");

    expect(settingsStore.gridConfig.config.reverseSort).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    setTimeout(() => {
      expect(settingsStore.multiGridConfig.config.gridSortReverse).toBe(true);
      done();
    }, 200);
  });
});

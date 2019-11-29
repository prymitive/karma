import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles
} from "Components/Theme/ReactSelect";
import { AlertGroupSortConfiguration } from "./AlertGroupSortConfiguration";

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
        reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light)
      }}
    >
      <AlertGroupSortConfiguration settingsStore={settingsStore} />
    </ThemeContext.Provider>
  );
};

const ExpandSortLabelSuggestions = async () => {
  settingsStore.gridConfig.config.sortOrder =
    settingsStore.gridConfig.options.label.value;
  const tree = FakeConfiguration();
  const labelSelect = tree.find("SortLabelName");
  await expect(
    labelSelect.instance().nameSuggestionsFetch
  ).resolves.toBeUndefined();

  tree
    .find("input#react-select-configuration-sort-label-input")
    .simulate("change", { target: { value: "a" } });

  fetch.resetMocks();
  return tree;
};

describe("<AlertGroupSortConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("invalid sortOrder value is reset on mount", done => {
    settingsStore.gridConfig.config.sortOrder = "badValue";
    FakeConfiguration();
    setTimeout(() => {
      expect(settingsStore.gridConfig.config.sortOrder).toBe(
        settingsStore.gridConfig.options.default.value
      );
      done();
    }, 200);
  });

  it("changing sort order value update settingsStore", async done => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    expect(settingsStore.gridConfig.config.sortOrder).toBe(
      settingsStore.gridConfig.options.label.value
    );
    const tree = FakeConfiguration();
    tree.instance().onSortOrderChange({
      label: settingsStore.gridConfig.options.startsAt.label,
      value: settingsStore.gridConfig.options.startsAt.value
    });
    setTimeout(() => {
      expect(settingsStore.gridConfig.config.sortOrder).toBe(
        settingsStore.gridConfig.options.startsAt.value
      );
      done();
    }, 200);
  });

  it("reverse checkbox is not rendered when sort order is == 'default'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.default.value;
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(0);
  });

  it("reverse checkbox is not rendered when sort order is == 'disabled'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.disabled.value;
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(0);
  });

  it("reverse checkbox is rendered when sort order is = 'startsAt'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.startsAt.value;
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(1);
  });

  it("reverse checkbox is rendered when sort order is = 'label'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(1);
  });

  it("label select is not rendered when sort order is != 'label'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.disabled.value;
    const tree = FakeConfiguration();
    const labelSelect = tree.find("SortLabelName");
    expect(labelSelect).toHaveLength(0);
  });

  it("label select is rendered when sort order is == 'label'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    const tree = FakeConfiguration();
    const labelSelect = tree.find("SortLabelName");
    expect(labelSelect).toHaveLength(1);
  });

  it("label select renders suggestions on click", async () => {
    fetch.mockResponse(JSON.stringify(["alertname", "cluster", "fakeLabel"]));
    const tree = await ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(3);
    expect(options.at(0).text()).toBe("alertname");
    expect(options.at(1).text()).toBe("cluster");
    expect(options.at(2).text()).toBe("fakeLabel");
  });

  it("label select handles fetch errors", async () => {
    fetch.mockReject("error");
    const tree = await ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(0);
  });

  it("label select handles invalid JSON", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetch.mockResponse("invalid JSON");
    const tree = await ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(0);
  });

  it("clicking on a label option updates settingsStore", async done => {
    fetch.mockResponse(JSON.stringify(["alertname", "cluster", "fakeLabel"]));
    const tree = await ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    options.at(1).simulate("click");
    setTimeout(() => {
      expect(settingsStore.gridConfig.config.sortLabel).toBe("cluster");
      done();
    }, 200);
  });

  it("clicking on the 'reverse' checkbox updates settingsStore", done => {
    settingsStore.gridConfig.config.reverseSort = false;
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-sort-reverse");

    expect(settingsStore.gridConfig.config.reverseSort).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    setTimeout(() => {
      expect(settingsStore.gridConfig.config.reverseSort).toBe(true);
      done();
    }, 200);
  });
});

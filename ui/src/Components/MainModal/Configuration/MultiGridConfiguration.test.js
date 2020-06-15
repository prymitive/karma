import React from "react";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__mocks__/Theme";
import { Settings } from "Stores/Settings";
import { useFetchGet } from "Hooks/useFetchGet";
import { MultiGridConfiguration } from "./MultiGridConfiguration";

let settingsStore;
beforeEach(() => {
  fetchMock.reset();
  fetchMock.any({
    body: JSON.stringify([]),
  });

  settingsStore = new Settings();

  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

afterEach(() => {
  jest.restoreAllMocks();
  useFetchGet.mockReset();
  fetchMock.reset();
});

const FakeConfiguration = () => {
  return mount(<MultiGridConfiguration settingsStore={settingsStore} />);
};

const ExpandSortLabelSuggestions = () => {
  settingsStore.gridConfig.config.sortOrder =
    settingsStore.gridConfig.options.label.value;
  const tree = FakeConfiguration();

  tree
    .find("input#react-select-configuration-grid-label-input")
    .simulate("change", { target: { value: "a" } });

  return tree;
};

describe("<MultiGridConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("correctly renders default option when multi-grid is disabled", () => {
    settingsStore.multiGridConfig.config.gridLabel = "";
    const tree = FakeConfiguration();
    expect(tree.find("Creatable").text()).toBe("Disable multi-grid");
  });

  it("correctly renders default option when multi-grid is enabled", () => {
    settingsStore.multiGridConfig.config.gridLabel = "cluster";
    const tree = FakeConfiguration();
    expect(tree.find("Creatable").text()).toBe("cluster");
  });

  it("label select handles fetch errors", () => {
    useFetchGet.fetch.setMockedData({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
    });
    const tree = ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(4);
    expect(options.at(0).text()).toBe("Disable multi-grid");
    expect(options.at(1).text()).toBe("@alertmanager");
    expect(options.at(2).text()).toBe("@cluster");
    expect(options.at(3).text()).toBe("@receiver");
  });

  it("clicking on a label option updates settingsStore", () => {
    const tree = ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    options.at(5).simulate("click");
    expect(settingsStore.multiGridConfig.config.gridLabel).toBe("job");
  });

  it("clicking on the 'reverse' checkbox updates settingsStore", () => {
    settingsStore.gridConfig.config.reverseSort = false;
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-multigrid-sort-reverse");

    expect(settingsStore.gridConfig.config.reverseSort).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    expect(settingsStore.multiGridConfig.config.gridSortReverse).toBe(true);
  });
});

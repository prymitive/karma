import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { MultiGridConfiguration } from "./MultiGridConfiguration";

let settingsStore: Settings;
beforeEach(() => {
  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify([]),
  });

  settingsStore = new Settings(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const FakeConfiguration = () => {
  return mount(<MultiGridConfiguration settingsStore={settingsStore} />, {
    wrappingComponent: ThemeContext.Provider,
    wrappingComponentProps: { value: MockThemeContext },
  });
};

const ExpandSortLabelSuggestions = () => {
  settingsStore.gridConfig.setSortOrder("label");
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
    settingsStore.multiGridConfig.setGridLabel("");
    const tree = FakeConfiguration();
    expect(tree.find("Creatable").text()).toBe("Disable multi-grid");
  });

  it("correctly renders default option when multi-grid is set to @auto", () => {
    settingsStore.multiGridConfig.setGridLabel("@auto");
    const tree = FakeConfiguration();
    expect(tree.find("Creatable").text()).toBe("Automatic selection");
  });

  it("correctly renders default option when multi-grid is enabled", () => {
    settingsStore.multiGridConfig.setGridLabel("cluster");
    const tree = FakeConfiguration();
    expect(tree.find("Creatable").text()).toBe("cluster");
  });

  it("label select handles fetch errors", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const tree = ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(5);
    expect(options.at(0).text()).toBe("Disable multi-grid");
    expect(options.at(1).text()).toBe("Automatic selection");
    expect(options.at(2).text()).toBe("@alertmanager");
    expect(options.at(3).text()).toBe("@cluster");
    expect(options.at(4).text()).toBe("@receiver");
  });

  it("clicking on a label option updates settingsStore", () => {
    const tree = ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    options.at(6).simulate("click");
    expect(settingsStore.multiGridConfig.config.gridLabel).toBe("job");
  });

  it("clicking on the 'reverse' checkbox updates settingsStore", () => {
    settingsStore.gridConfig.setSortReverse(false);
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-multigrid-sort-reverse");

    expect(settingsStore.gridConfig.config.reverseSort).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    expect(settingsStore.multiGridConfig.config.gridSortReverse).toBe(true);
  });
});

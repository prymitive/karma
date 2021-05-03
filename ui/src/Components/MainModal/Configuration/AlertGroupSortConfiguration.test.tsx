import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { AlertGroupSortConfiguration } from "./AlertGroupSortConfiguration";

let settingsStore: Settings;

beforeEach(() => {
  settingsStore = new Settings(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const FakeConfiguration = () => {
  return mount(<AlertGroupSortConfiguration settingsStore={settingsStore} />, {
    wrappingComponent: ThemeContext.Provider,
    wrappingComponentProps: { value: MockThemeContext },
  });
};

const ExpandSortLabelSuggestions = () => {
  settingsStore.gridConfig.setSortOrder("label");
  const tree = FakeConfiguration();

  tree
    .find("input#react-select-configuration-sort-label-input")
    .simulate("change", { target: { value: "a" } });

  return tree;
};

describe("<AlertGroupSortConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const tree = FakeConfiguration();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("invalid sortOrder value is reset on mount", () => {
    settingsStore.gridConfig.setSortOrder("badValue" as any);
    FakeConfiguration();
    expect(settingsStore.gridConfig.config.sortOrder).toBe(
      settingsStore.gridConfig.options.default.value
    );
  });

  it("changing sort order value update settingsStore", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });

    settingsStore.gridConfig.setSortOrder("label");
    expect(settingsStore.gridConfig.config.sortOrder).toBe(
      settingsStore.gridConfig.options.label.value
    );
    const tree = FakeConfiguration();

    tree
      .find("input#react-select-configuration-sort-order-input")
      .simulate("change", { target: { value: " " } });
    tree.find("div.react-select__option").at(2).simulate("click");

    expect(settingsStore.gridConfig.config.sortOrder).toBe(
      settingsStore.gridConfig.options.startsAt.value
    );
  });

  it("reverse checkbox is not rendered when sort order is == 'default'", () => {
    settingsStore.gridConfig.setSortOrder("default");
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(0);
  });

  it("reverse checkbox is not rendered when sort order is == 'disabled'", () => {
    settingsStore.gridConfig.setSortOrder("disabled");
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(0);
  });

  it("reverse checkbox is rendered when sort order is = 'startsAt'", () => {
    settingsStore.gridConfig.setSortOrder("startsAt");
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(1);
  });

  it("reverse checkbox is rendered when sort order is = 'label'", () => {
    settingsStore.gridConfig.setSortOrder("label");
    const tree = FakeConfiguration();
    const labelSelect = tree.find("#configuration-sort-reverse");
    expect(labelSelect).toHaveLength(1);
  });

  it("label select is not rendered when sort order is != 'label'", () => {
    settingsStore.gridConfig.setSortOrder("disabled");
    const tree = FakeConfiguration();
    const labelSelect = tree.find("SortLabelName");
    expect(labelSelect).toHaveLength(0);
  });

  it("label select is rendered when sort order is == 'label'", () => {
    settingsStore.gridConfig.setSortOrder("label");
    const tree = FakeConfiguration();
    const labelSelect = tree.find("SortLabelName");
    expect(labelSelect).toHaveLength(1);
  });

  it("label select renders suggestions on click", () => {
    const tree = ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(3);
    expect(options.at(0).text()).toBe("cluster");
    expect(options.at(1).text()).toBe("job");
    expect(options.at(2).text()).toBe("instance");
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
    expect(options).toHaveLength(0);
  });

  it("clicking on a label option updates settingsStore", () => {
    expect(settingsStore.gridConfig.config.sortLabel).toBeNull();
    const tree = ExpandSortLabelSuggestions();
    const options = tree.find("div.react-select__option");
    options.at(1).simulate("click");
    expect(settingsStore.gridConfig.config.sortLabel).toBe("job");
  });

  it("clicking on the 'reverse' checkbox updates settingsStore", () => {
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortReverse(false);
    const tree = FakeConfiguration();
    const checkbox = tree.find("#configuration-sort-reverse");

    expect(settingsStore.gridConfig.config.reverseSort).toBe(false);
    checkbox.simulate("change", { target: { checked: true } });
    expect(settingsStore.gridConfig.config.reverseSort).toBe(true);
  });
});

import { render, fireEvent } from "@testing-library/react";

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

const renderConfiguration = () => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <AlertGroupSortConfiguration settingsStore={settingsStore} />
    </ThemeContext.Provider>,
  );
};

const expandSortLabelSuggestions = () => {
  settingsStore.gridConfig.setSortOrder("label");
  const view = renderConfiguration();

  const input = view.container.querySelector(
    "input#react-select-configuration-sort-label-input",
  );
  fireEvent.change(input!, { target: { value: "c" } });

  return view;
};

describe("<AlertGroupSortConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("invalid sortOrder value is reset on mount", () => {
    settingsStore.gridConfig.setSortOrder("badValue" as any);
    renderConfiguration();
    expect(settingsStore.gridConfig.config.sortOrder).toBe(
      settingsStore.gridConfig.options.default.value,
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
      settingsStore.gridConfig.options.label.value,
    );
    const { container } = renderConfiguration();

    const input = container.querySelector(
      "input#react-select-configuration-sort-order-input",
    );
    fireEvent.change(input!, { target: { value: " " } });
    const options = container.querySelectorAll("div.react-select__option");
    fireEvent.click(options[2]);

    expect(settingsStore.gridConfig.config.sortOrder).toBe(
      settingsStore.gridConfig.options.startsAt.value,
    );
  });

  it("reverse checkbox is not rendered when sort order is == 'default'", () => {
    settingsStore.gridConfig.setSortOrder("default");
    const { container } = renderConfiguration();
    const labelSelect = container.querySelector("#configuration-sort-reverse");
    expect(labelSelect).not.toBeInTheDocument();
  });

  it("reverse checkbox is not rendered when sort order is == 'disabled'", () => {
    settingsStore.gridConfig.setSortOrder("disabled");
    const { container } = renderConfiguration();
    const labelSelect = container.querySelector("#configuration-sort-reverse");
    expect(labelSelect).not.toBeInTheDocument();
  });

  it("reverse checkbox is rendered when sort order is = 'startsAt'", () => {
    settingsStore.gridConfig.setSortOrder("startsAt");
    const { container } = renderConfiguration();
    const labelSelect = container.querySelector("#configuration-sort-reverse");
    expect(labelSelect).toBeInTheDocument();
  });

  it("reverse checkbox is rendered when sort order is = 'label'", () => {
    settingsStore.gridConfig.setSortOrder("label");
    const { container } = renderConfiguration();
    const labelSelect = container.querySelector("#configuration-sort-reverse");
    expect(labelSelect).toBeInTheDocument();
  });

  it("label select is not rendered when sort order is != 'label'", () => {
    settingsStore.gridConfig.setSortOrder("disabled");
    const { container } = renderConfiguration();
    const labelSelect = container.querySelector(
      "input#react-select-configuration-sort-label-input",
    );
    expect(labelSelect).not.toBeInTheDocument();
  });

  it("label select is rendered when sort order is == 'label'", () => {
    settingsStore.gridConfig.setSortOrder("label");
    const { container } = renderConfiguration();
    const labelSelect = container.querySelector(
      "input#react-select-configuration-sort-label-input",
    );
    expect(labelSelect).toBeInTheDocument();
  });

  it("label select renders suggestions on click", () => {
    const { container } = expandSortLabelSuggestions();
    const options = container.querySelectorAll("div.react-select__option");
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe("cluster");
    expect(options[1].textContent).toBe("instance");
    expect(options[2].textContent).toBe("New label: c");
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
    const { container } = expandSortLabelSuggestions();
    const options = container.querySelectorAll("div.react-select__option");
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toBe("New label: c");
  });

  it("clicking on a label option updates settingsStore", () => {
    expect(settingsStore.gridConfig.config.sortLabel).toBeNull();
    const { container } = expandSortLabelSuggestions();
    const options = container.querySelectorAll("div.react-select__option");
    fireEvent.click(options[1]);
    expect(settingsStore.gridConfig.config.sortLabel).toBe("instance");
  });

  it("clicking on the 'reverse' checkbox updates settingsStore", () => {
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortReverse(false);
    const { container } = renderConfiguration();
    const checkbox = container.querySelector("#configuration-sort-reverse");

    expect(settingsStore.gridConfig.config.reverseSort).toBe(false);
    fireEvent.click(checkbox!);
    expect(settingsStore.gridConfig.config.reverseSort).toBe(true);
  });
});

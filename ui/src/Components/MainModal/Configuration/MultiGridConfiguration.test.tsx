import { render, screen, fireEvent } from "@testing-library/react";

import fetchMock from "fetch-mock";

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

const renderConfiguration = () => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <MultiGridConfiguration settingsStore={settingsStore} />
    </ThemeContext.Provider>,
  );
};

const expandSortLabelSuggestions = () => {
  settingsStore.gridConfig.setSortOrder("label");
  const view = renderConfiguration();

  const input = view.container.querySelector(
    "input#react-select-configuration-grid-label-input",
  );
  fireEvent.change(input!, { target: { value: " " } });

  return view;
};

describe("<MultiGridConfiguration />", () => {
  it("matches snapshot with default values", () => {
    const { asFragment } = renderConfiguration();
    expect(asFragment()).toMatchSnapshot();
  });

  it("correctly renders default option when multi-grid is disabled", () => {
    settingsStore.multiGridConfig.setGridLabel("");
    renderConfiguration();
    expect(screen.getByText("Disable multi-grid")).toBeInTheDocument();
  });

  it("correctly renders default option when multi-grid is set to @auto", () => {
    settingsStore.multiGridConfig.setGridLabel("@auto");
    renderConfiguration();
    expect(screen.getByText("Automatic selection")).toBeInTheDocument();
  });

  it("correctly renders default option when multi-grid is enabled", () => {
    settingsStore.multiGridConfig.setGridLabel("cluster");
    renderConfiguration();
    expect(screen.getByText("cluster")).toBeInTheDocument();
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
    expect(options).toHaveLength(6);
    expect(options[0].textContent).toBe("Disable multi-grid");
    expect(options[1].textContent).toBe("Automatic selection");
    expect(options[2].textContent).toBe("@alertmanager");
    expect(options[3].textContent).toBe("@cluster");
    expect(options[4].textContent).toBe("@receiver");
    expect(options[5].textContent).toBe("New label:  ");
  });

  it("clicking on a label option updates settingsStore", () => {
    const { container } = expandSortLabelSuggestions();
    const options = container.querySelectorAll("div.react-select__option");
    fireEvent.click(options[3]);
    expect(settingsStore.multiGridConfig.config.gridLabel).toBe("@cluster");
  });

  it("clicking on the 'reverse' checkbox updates settingsStore", () => {
    settingsStore.multiGridConfig.setGridSortReverse(false);
    const { container } = renderConfiguration();
    const checkbox = container.querySelector(
      "#configuration-multigrid-sort-reverse",
    );

    expect(settingsStore.multiGridConfig.config.gridSortReverse).toBe(false);
    fireEvent.click(checkbox!);
    expect(settingsStore.multiGridConfig.config.gridSortReverse).toBe(true);
  });
});

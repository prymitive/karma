import { render, screen, fireEvent } from "@testing-library/react";

import fetchMock from "fetch-mock";

import { MockThemeContext } from "__fixtures__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { MainModalContent } from "./MainModalContent";

let alertStore: AlertStore;
let settingsStore: Settings;
const onHide = jest.fn();

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  onHide.mockClear();
  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify([]),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.reset();
});

const renderModalContent = () => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <MainModalContent
        alertStore={alertStore}
        settingsStore={settingsStore}
        onHide={onHide}
        expandAllOptions={true}
      />
    </ThemeContext.Provider>,
  );
};

const validateSetTab = (title: string) => {
  const { container } = renderModalContent();

  const tab = screen.getByText(title);
  fireEvent.click(tab);
  expect(container.querySelector(".nav-link.active")?.textContent).toBe(title);
};

describe("<MainModalContent />", () => {
  it("matches snapshot", () => {
    const { asFragment } = renderModalContent();
    expect(asFragment()).toMatchSnapshot();
  });

  it("shows 'Configuration' tab by default", () => {
    const { container } = renderModalContent();
    const activeTab = container.querySelector(".nav-link.active");
    expect(activeTab?.textContent).toBe("Configuration");
  });

  it("calls setTab('configuration') after clicking on the 'Configuration' tab", () => {
    validateSetTab("Configuration");
  });

  it("calls setTab('help') after clicking on the 'Help' tab", () => {
    validateSetTab("Help");
  });

  it("shows username when alertStore.info.authentication.enabled=true", () => {
    alertStore.info.setAuthentication(true, "me@example.com");
    renderModalContent();
    expect(screen.getByText(/Username: me@example.com/)).toBeInTheDocument();
  });
});

// Mock react-cool-dimensions to avoid ResizeObserver console.error
jest.mock("react-cool-dimensions", () => ({
  __esModule: true,
  default: () => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    width: 1000,
    height: 500,
    entry: undefined,
  }),
}));

import { act } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import fetchMock from "@fetch-mock/jest";

import { MockThemeContext } from "__fixtures__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { MainModal } from ".";

let alertStore: AlertStore;
let settingsStore: Settings;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);

  jest.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.route("*", {
    body: JSON.stringify([]),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.mockReset();
  document.body.className = "";
});

const renderMainModal = async () => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <MainModal alertStore={alertStore} settingsStore={settingsStore} />
      </ThemeContext.Provider>,
    );
  });
  return result!;
};

describe("<MainModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", async () => {
    // Verifies only toggle icon is rendered when modal is closed
    const { container } = await renderMainModal();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument();
  });

  it("renders a spinner placeholder while modal content is loading", async () => {
    // Verifies spinner is shown while lazy content loads
    const { container } = await renderMainModal();
    const toggle = container.querySelector(".nav-link");
    fireEvent.click(toggle!);
    expect(
      document.body.querySelector(".modal-content svg.fa-spinner"),
    ).toBeInTheDocument();
  });

  it("renders modal content if fallback is not used", async () => {
    // Verifies modal content is rendered after lazy loading
    const { container } = await renderMainModal();
    const toggle = container.querySelector(".nav-link");
    await act(async () => {
      fireEvent.click(toggle!);
    });
    expect(screen.getByText("Configuration")).toBeInTheDocument();
  });

  it("hides the modal when toggle() is called twice", async () => {
    // Verifies modal closes when toggle is clicked twice
    const { container } = await renderMainModal();
    const toggle = container.querySelector(".nav-link");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.getByText("Configuration")).toBeInTheDocument();

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument();
  });

  it("hides the modal when button.btn-close is clicked", async () => {
    // Verifies modal closes when close button is clicked
    const { container } = await renderMainModal();
    const toggle = container.querySelector(".nav-link");

    fireEvent.click(toggle!);
    expect(screen.getByText("Configuration")).toBeInTheDocument();

    const closeBtn = document.body.querySelector("button.btn-close");
    fireEvent.click(closeBtn!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument();
  });

  it("'modal-open' class is appended to body node when modal is visible", async () => {
    // Verifies modal-open class is added to body when modal opens
    const { container } = await renderMainModal();
    const toggle = container.querySelector(".nav-link");
    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", async () => {
    // Verifies modal-open class is removed from body when modal closes
    const { container } = await renderMainModal();
    const toggle = container.querySelector(".nav-link");

    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", async () => {
    // Verifies modal-open class is removed from body when component unmounts
    const { container, unmount } = await renderMainModal();
    const toggle = container.querySelector(".nav-link");
    fireEvent.click(toggle!);
    unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

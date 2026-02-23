import { act } from "react-dom/test-utils";

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

const renderMainModal = () => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <MainModal alertStore={alertStore} settingsStore={settingsStore} />
    </ThemeContext.Provider>,
  );
};

describe("<MainModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const { container } = renderMainModal();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument();
  });

  it("renders a spinner placeholder while modal content is loading", () => {
    const { container } = renderMainModal();
    const toggle = container.querySelector(".nav-link");
    fireEvent.click(toggle!);
    expect(
      document.body.querySelector(".modal-content svg.fa-spinner"),
    ).toBeInTheDocument();
  });

  it("renders modal content if fallback is not used", () => {
    const { container } = renderMainModal();
    const toggle = container.querySelector(".nav-link");
    fireEvent.click(toggle!);
    expect(screen.getByText("Configuration")).toBeInTheDocument();
  });

  it("hides the modal when toggle() is called twice", () => {
    const { container } = renderMainModal();
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

  it("hides the modal when button.btn-close is clicked", () => {
    const { container } = renderMainModal();
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

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const { container } = renderMainModal();
    const toggle = container.querySelector(".nav-link");
    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const { container } = renderMainModal();
    const toggle = container.querySelector(".nav-link");

    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const { container, unmount } = renderMainModal();
    const toggle = container.querySelector(".nav-link");
    fireEvent.click(toggle!);
    unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

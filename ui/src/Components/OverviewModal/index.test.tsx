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

import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { useFetchGetMock } from "__fixtures__/useFetchGet";
import { AlertStore } from "Stores/AlertStore";
import { OverviewModal } from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  jest.useFakeTimers();
});

afterEach(() => {
  document.body.className = "";
});

const renderOverviewModal = () => {
  return render(<OverviewModal alertStore={alertStore} />);
};

describe("<OverviewModal />", () => {
  it("only renders the counter when modal is not shown", () => {
    renderOverviewModal();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("renders a spinner placeholder while modal content is loading", () => {
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    expect(
      document.body.querySelector(".modal-content svg.fa-spinner"),
    ).toBeInTheDocument();
  });

  it("renders a spinner placeholder while fetch is in progress", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: null,
      isLoading: true,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    expect(
      document.body.querySelector(".modal-content svg.fa-spinner"),
    ).toBeInTheDocument();
  });

  it("renders an error message on fetch error", () => {
    useFetchGetMock.fetch.setMockedData({
      response: null,
      error: "mock error",
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    expect(screen.getByText("mock error")).toBeInTheDocument();
  });

  it("renders modal content if fallback is not used", () => {
    useFetchGetMock.fetch.setMockedData({
      response: {
        total: 20,
        counters: [],
      },
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("re-fetches counters after timestamp change", () => {
    alertStore.info.setTimestamp("old");
    useFetchGetMock.fetch.setMockedData({
      response: {
        total: 20,
        counters: [],
      },
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      get: jest.fn(),
      cancelGet: jest.fn(),
    });
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    expect(useFetchGetMock.fetch.calls).toHaveLength(1);

    act(() => {
      alertStore.info.setTimestamp("new");
    });
    expect(useFetchGetMock.fetch.calls).toHaveLength(2);
  });

  it("hides the modal when toggle() is called twice", async () => {
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.getByText("Overview")).toBeInTheDocument();

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    });
  });

  it("hides the modal when button.btn-close is clicked", async () => {
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");

    fireEvent.click(toggle!);
    expect(screen.getByText("Overview")).toBeInTheDocument();

    const closeBtn = document.body.querySelector("button.btn-close");
    fireEvent.click(closeBtn!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    });
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const { container } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const { container } = renderOverviewModal();

    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    expect(document.body.className.split(" ")).toContain("modal-open");

    fireEvent.click(toggle!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const { container, unmount } = renderOverviewModal();
    const toggle = container.querySelector("div.navbar-brand");
    fireEvent.click(toggle!);
    unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

import { act } from "react";

import { render, screen } from "@testing-library/react";

import { ErrorBoundary } from "./ErrorBoundary";

let consoleSpy: any;

beforeEach(() => {
  jest.useFakeTimers();
  consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const FailingComponent = () => {
  throw new Error("Error thrown from problem child");
};

const renderFailingComponent = () => {
  return render(
    <ErrorBoundary>
      <FailingComponent></FailingComponent>
    </ErrorBoundary>,
  );
};

describe("<ErrorBoundary />", () => {
  it("matches snapshot", () => {
    const { asFragment } = renderFailingComponent();
    expect(asFragment()).toMatchSnapshot();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("componentDidCatch should catch an error from FailingComponent", () => {
    jest.spyOn(ErrorBoundary.prototype, "componentDidCatch");
    renderFailingComponent();
    expect(ErrorBoundary.prototype.componentDidCatch).toHaveBeenCalled();
  });

  it("sets up timer to reload after 60s", () => {
    // Verifies that a timer is set up for auto-reload after error
    renderFailingComponent();
    expect(jest.getTimerCount()).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("renders error message when component fails", () => {
    renderFailingComponent();
    expect(
      screen.getByText("Error: Error thrown from problem child"),
    ).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("decrements reload countdown each second", () => {
    // Verifies the reloadApp method decrements the countdown timer
    renderFailingComponent();
    expect(screen.getByText(/auto refresh in 60s/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/auto refresh in 59s/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });

  it("reloadApp decrements countdown when more than one second is left", () => {
    const boundary = new ErrorBoundary({ children: <span /> });
    const setStateSpy = jest.spyOn(boundary, "setState");
    (boundary as any).state = { cachedError: null, reloadSeconds: 2 };

    boundary.reloadApp();

    expect(setStateSpy).toHaveBeenCalledWith({ reloadSeconds: 1 });
  });

  it("reloadApp does not decrement when countdown reaches 1 or less", () => {
    // Verifies that reloadApp calls window.location.reload when reloadSeconds <= 1 (line 65)
    const boundary = new ErrorBoundary({ children: <span /> });
    const setStateSpy = jest.spyOn(boundary, "setState");
    (boundary as any).state = { cachedError: null, reloadSeconds: 1 };

    boundary.reloadApp();

    expect(setStateSpy).not.toHaveBeenCalled();
  });

  it("componentDidCatch does not set error if already cached", () => {
    // Verifies that componentDidCatch skips setState when error is already cached (line 75)
    const boundary = new ErrorBoundary({ children: <span /> });
    const setStateSpy = jest.spyOn(boundary, "setState");
    const error = new Error("Test error");
    (boundary as any).state = { cachedError: error, reloadSeconds: 60 };

    boundary.componentDidCatch(error, { componentStack: "" });

    expect(setStateSpy).not.toHaveBeenCalled();
  });

  it("componentDidCatch does not set timer if already set", () => {
    // Verifies that componentDidCatch skips setInterval when timer is already set (line 80)
    const boundary = new ErrorBoundary({ children: <span /> });
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const error = new Error("Test error");
    (boundary as any).timer = 123;

    boundary.componentDidCatch(error, { componentStack: "" });

    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});

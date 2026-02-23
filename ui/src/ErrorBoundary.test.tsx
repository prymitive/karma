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

    jest.advanceTimersByTime(1000);
    expect(screen.getByText(/auto refresh in 59s/)).toBeInTheDocument();

    jest.advanceTimersByTime(1000);
    expect(screen.getByText(/auto refresh in 58s/)).toBeInTheDocument();
  });
});

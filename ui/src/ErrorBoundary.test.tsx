import { render, screen } from "@testing-library/react";

import { ErrorBoundary } from "./ErrorBoundary";

declare let window: any;

let consoleSpy: any;

beforeEach(() => {
  jest.useFakeTimers();
  consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  delete window.location;
  window.location = { reload: jest.fn() };
});

afterEach(() => {
  jest.clearAllTimers();
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

  it("calls window.location.reload after 60s", () => {
    const reloadSpy = jest.spyOn(global.window.location, "reload");
    renderFailingComponent();
    jest.advanceTimersByTime(1000 * 61);
    expect(reloadSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("renders error message when component fails", () => {
    renderFailingComponent();
    expect(
      screen.getByText("Error: Error thrown from problem child"),
    ).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

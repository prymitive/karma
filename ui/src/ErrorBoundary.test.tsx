import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import * as Sentry from "@sentry/browser";

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

const MountedFailingComponent = () => {
  return mount(
    <ErrorBoundary>
      <FailingComponent></FailingComponent>
    </ErrorBoundary>
  );
};

describe("<ErrorBoundary />", () => {
  it("matches snapshot", () => {
    const tree = MountedFailingComponent();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("componentDidCatch should catch an error from FailingComponent", () => {
    jest.spyOn(ErrorBoundary.prototype, "componentDidCatch");
    MountedFailingComponent();
    expect(ErrorBoundary.prototype.componentDidCatch).toHaveBeenCalled();
  });

  it("componentDidCatch should report to sentry", () => {
    const sentrySpy = jest.spyOn(Sentry, "captureException");
    MountedFailingComponent();
    expect(sentrySpy).toHaveBeenCalled();
  });

  it("componentDidCatch passes scope to sentry", () => {
    const sentrySpy = jest.spyOn(Sentry, "captureException");
    Sentry.init({ dsn: "https://foobar@localhost/123456" });

    const tree = mount(
      <ErrorBoundary>
        <div />
      </ErrorBoundary>
    );
    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    expect(sentrySpy).toHaveBeenCalled();
  });

  it("componentDidCatch is only called once", () => {
    const sentrySpy = jest.spyOn(Sentry, "captureException");
    Sentry.init({ dsn: "https://foobar@localhost/123456" });

    const tree = mount(
      <ErrorBoundary>
        <div />
      </ErrorBoundary>
    );
    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    expect(sentrySpy).toHaveBeenCalledTimes(1);
  });

  it("calls window.location.reload after 60s", () => {
    const reloadSpy = jest.spyOn(global.window.location, "reload");
    MountedFailingComponent();
    jest.runTimersToTime(1000 * 61);
    expect(reloadSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("reloadSeconds is 40 after 20s with multiple exceptions", () => {
    const tree = MountedFailingComponent();

    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    jest.runTimersToTime(1000 * 10);
    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    jest.runTimersToTime(1000 * 5);
    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    jest.runTimersToTime(1000 * 5);
    (tree as any)
      .instance()
      .componentDidCatch(new Error("foo"), { componentStack: "bar" });
    expect((tree as any).instance().state.reloadSeconds).toBe(40);
  });
});

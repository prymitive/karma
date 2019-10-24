import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import * as Sentry from "@sentry/browser";

import { ErrorBoundary } from "./ErrorBoundary";

let consoleSpy;

beforeEach(() => {
  jest.useFakeTimers();
  consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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
      <FailingComponent />
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
    const instance = tree.instance();
    instance.componentDidCatch("foo", { foo: "bar" });
    expect(sentrySpy).toHaveBeenCalled();
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
    const instance = tree.instance();

    instance.componentDidCatch("foo", { foo: "bar" });
    jest.runTimersToTime(1000 * 10);
    instance.componentDidCatch("foo", { foo: "bar" });
    jest.runTimersToTime(1000 * 5);
    instance.componentDidCatch("foo", { foo: "bar" });
    jest.runTimersToTime(1000 * 5);
    instance.componentDidCatch("foo", { foo: "bar" });
    expect(tree.instance().state.reloadSeconds).toBe(40);
  });
});

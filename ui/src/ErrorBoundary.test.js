import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import * as Sentry from "@sentry/browser";

import { ErrorBoundary } from "./ErrorBoundary";

beforeAll(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
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
  });

  it("componentDidCatch should catch an error from FailingComponent", () => {
    jest.spyOn(ErrorBoundary.prototype, "componentDidCatch");
    MountedFailingComponent();
    expect(ErrorBoundary.prototype.componentDidCatch).toHaveBeenCalled();
  });

  it("componentDidCatch should report to sentry", () => {
    MountedFailingComponent();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("componentDidCatch passes scope to sentry", () => {
    const tree = mount(
      <ErrorBoundary>
        <div />
      </ErrorBoundary>
    );
    const instance = tree.instance();
    instance.componentDidCatch("foo", { foo: "bar" });
    expect(Sentry.MockScope.setExtra).toHaveBeenCalledWith("foo", "bar");
  });

  it("calls window.location.reload after 60s", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const reloadSpy = jest.spyOn(global.window.location, "reload");
    MountedFailingComponent();
    jest.runTimersToTime(1000 * 61);
    expect(reloadSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

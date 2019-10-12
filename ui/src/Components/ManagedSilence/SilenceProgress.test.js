import React from "react";

import { mount } from "enzyme";

import { toJS } from "mobx";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__mocks__/Alerts";
import { SilenceProgress } from "./SilenceProgress";

let silence;

beforeEach(() => {
  silence = MockSilence();

  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
  // reset Date() to current time
  clear();
});

const MountedSilenceProgress = () => {
  return mount(<SilenceProgress silence={silence} />);
};

describe("<SilenceProgress />", () => {
  it("renders with class 'danger' and no progressbar when expired", () => {
    advanceTo(moment.utc([2001, 0, 1, 23, 0, 0]));
    const tree = MountedSilenceProgress();
    expect(toDiffableHtml(tree.html())).toMatch(/badge-danger/);
    expect(tree.text()).toMatch(/Expired a year ago/);
  });

  it("progressbar uses class 'danger' when > 90%", () => {
    advanceTo(moment.utc([2000, 0, 1, 0, 55, 0]));
    const tree = MountedSilenceProgress();
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-danger/);
  });

  it("progressbar uses class 'danger' when > 75%", () => {
    advanceTo(moment.utc([2000, 0, 1, 0, 50, 0]));
    const tree = MountedSilenceProgress();
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-warning/);
  });

  it("progressbar uses class 'success' when <= 75%", () => {
    advanceTo(moment.utc([2000, 0, 1, 0, 30, 0]));
    const tree = MountedSilenceProgress();
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-success/);
  });

  it("calling calculate() on progress multiple times in a row doesn't change the value", () => {
    const startsAt = moment.utc([2000, 0, 1, 0, 0, 0]);
    const endsAt = moment.utc([2000, 0, 1, 1, 0, 0]);

    const tree = MountedSilenceProgress();
    const instance = tree.instance();

    const value = toJS(instance.progress.value);
    instance.progress.calculate(startsAt, endsAt);
    instance.progress.calculate(startsAt, endsAt);
    instance.progress.calculate(startsAt, endsAt);
    expect(toJS(instance.progress.value)).toBe(value);
  });

  it("resets the timer on unmount", () => {
    const tree = MountedSilenceProgress();
    expect(tree.instance().progressTimer).not.toBeNull();
    tree.instance().componentWillUnmount();
    expect(tree.instance().progressTimer).toBeNull();
  });
});

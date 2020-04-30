import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";
import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__mocks__/Alerts";
import { SilenceProgress } from "./SilenceProgress";

let silence;

beforeAll(() => {
  jest.useFakeTimers();
});

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

  it("progressbar is updated every 30 seconds", () => {
    advanceTo(moment.utc([2000, 0, 1, 0, 30, 0]));
    const tree = MountedSilenceProgress();
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-success/);

    advanceTo(moment.utc([2000, 0, 1, 0, 50, 0]));
    jest.runOnlyPendingTimers();
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-warning/);

    advanceTo(moment.utc([2000, 0, 1, 0, 55, 0]));
    jest.runOnlyPendingTimers();
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-danger/);
  });

  it("unmounts cleanly", () => {
    const tree = MountedSilenceProgress();
    tree.unmount();
  });
});

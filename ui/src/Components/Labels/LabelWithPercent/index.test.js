import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import { LabelWithPercent } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedLabelWithPercent = (name, value, hits, percent, offset) => {
  return mount(
    <LabelWithPercent
      alertStore={alertStore}
      name={name}
      value={value}
      hits={hits}
      percent={percent}
      offset={offset}
    />
  );
};

const RenderAndClick = (name, value, clickOptions) => {
  const tree = MountedLabelWithPercent(name, value, 25, 50, 0);
  tree.find(".components-label").simulate("click", clickOptions || {});
};

describe("<LabelWithPercent />", () => {
  it("matches snapshot with offset=0", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 50, 0);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with offset=25", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 50, 25);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("calling onClick() adds a new filter 'foo=bar'", () => {
    RenderAndClick("foo", "bar");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("foo=bar")
    );
  });

  it("calling onClick() while holding Alt key adds a new filter 'foo!=bar'", () => {
    RenderAndClick("foo", "bar", { altKey: true });
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("foo!=bar")
    );
  });

  it("uses bg-danger when percent is >66", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 67, 0);
    expect(tree.html()).toMatch(/progress-bar bg-danger/);
  });

  it("uses bg-warning when percent is >33", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 66, 0);
    expect(tree.html()).toMatch(/progress-bar bg-warning/);
  });

  it("uses bg-success when percent is <=33", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 33, 0);
    expect(tree.html()).toMatch(/progress-bar bg-success/);
  });
});

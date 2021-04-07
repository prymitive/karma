import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";

import LabelWithPercent from ".";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedLabelWithPercent = (
  name: string,
  value: string,
  hits: number,
  percent: number,
  offset: number,
  isActive: boolean
) => {
  return mount(
    <LabelWithPercent
      alertStore={alertStore}
      name={name}
      value={value}
      hits={hits}
      percent={percent}
      offset={offset}
      isActive={isActive}
    />
  );
};

const RenderAndClick = (name: string, value: string, clickOptions?: any) => {
  const tree = MountedLabelWithPercent(name, value, 25, 50, 0, false);
  tree
    .find(".components-label")
    .find("span")
    .at(2)
    .simulate("click", clickOptions || {});
};

describe("<LabelWithPercent />", () => {
  it("matches snapshot with offset=0", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 50, 0, false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with offset=25", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 50, 25, false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot with isActive=true", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 50, 0, true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("calling adds a new filter 'foo=bar'", () => {
    RenderAndClick("foo", "bar");
    expect(alertStore.filters.values).toHaveLength(1);
    expect(alertStore.filters.values).toContainEqual(
      NewUnappliedFilter("foo=bar")
    );
  });

  it("clicking the X buttom removes label from filters", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 50, 0, true);
    tree.find(".components-label").find("svg").simulate("click");
    expect(alertStore.filters.values).toHaveLength(0);
    expect(alertStore.filters.values).not.toContainEqual(
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
    const tree = MountedLabelWithPercent("foo", "bar", 25, 67, 0, false);
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-danger/);
  });

  it("uses bg-warning when percent is >33", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 66, 0, false);
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-warning/);
  });

  it("uses bg-success when percent is <=33", () => {
    const tree = MountedLabelWithPercent("foo", "bar", 25, 33, 0, false);
    expect(toDiffableHtml(tree.html())).toMatch(/progress-bar bg-success/);
  });
});

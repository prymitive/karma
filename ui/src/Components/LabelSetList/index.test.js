import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { LabelSetList } from ".";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedLabelSetList = labelsList => {
  return mount(
    <LabelSetList alertStore={alertStore} labelsList={labelsList} />
  );
};

describe("<LabelSetList />", () => {
  it("renders placeholder on empty list", () => {
    const tree = MountedLabelSetList([]);
    expect(tree.text()).toBe("No alerts matched");
  });

  it("renders labels on populated list", () => {
    const tree = MountedLabelSetList([{ foo: "bar" }]);
    expect(tree.text()).not.toBe("No alerts matched");
    expect(tree.text()).toBe("foo: bar");
  });

  it("matches snapshot with populated list", () => {
    const tree = MountedLabelSetList([
      { foo: "bar" },
      { job: "node_exporter" },
      { instance: "server1" },
      { cluster: "prod" }
    ]);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't render pagination when list has 9 elements", () => {
    const tree = MountedLabelSetList(
      Array.from(Array(9), (_, i) => ({ instance: `server${i}` }))
    );
    expect(tree.find(".pagination")).toHaveLength(0);
  });

  it("renders pagination when list has 11 elements", () => {
    const tree = MountedLabelSetList(
      Array.from(Array(11), (_, i) => ({ instance: `server${i}` }))
    );
    expect(tree.find(".pagination")).toHaveLength(1);
  });

  it("clicking on pagination changes displayed elements", () => {
    const tree = MountedLabelSetList(
      Array.from(Array(21), (_, i) => ({ instance: `server${i + 1}` }))
    );
    const pageLink = tree.find(".page-link").at(2);
    pageLink.simulate("click");
    expect(tree.text()).toBe("instance: server21");
  });
});

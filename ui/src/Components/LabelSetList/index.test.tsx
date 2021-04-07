import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { LabelsT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { LabelSetList } from ".";

let alertStore: AlertStore;

declare let global: any;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

afterEach(() => {
  global.window.innerWidth = 1024;
});

const MountedLabelSetList = (labelsList: LabelsT[]) => {
  return mount(
    <LabelSetList
      alertStore={alertStore}
      labelsList={labelsList}
      title="Affected alerts"
    />
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
    expect(tree.find("ul.list-group").text()).toBe("foo: bar");
  });

  it("matches snapshot with populated list", () => {
    const tree = MountedLabelSetList([
      { foo: "bar" },
      { job: "node_exporter" },
      { instance: "server1" },
      { cluster: "prod" },
    ]);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("doesn't render pagination when list has 10 elements on  desktop", () => {
    global.window.innerWidth = 1024;
    const tree = MountedLabelSetList(
      Array.from(Array(10), (_, i) => ({ instance: `server${i}` }))
    );
    expect(tree.find(".pagination")).toHaveLength(0);
  });

  it("doesn't render pagination when list has 5 elements on  desktop", () => {
    global.window.innerWidth = 500;
    const tree = MountedLabelSetList(
      Array.from(Array(5), (_, i) => ({ instance: `server${i}` }))
    );
    expect(tree.find(".pagination")).toHaveLength(0);
  });

  it("renders pagination when list has 11 elements on desktop", () => {
    global.window.innerWidth = 1024;
    const tree = MountedLabelSetList(
      Array.from(Array(11), (_, i) => ({ instance: `server${i}` }))
    );
    expect(tree.find(".pagination")).toHaveLength(1);
  });

  it("renders pagination when list has 6 elements on mobile", () => {
    global.window.innerWidth = 500;
    const tree = MountedLabelSetList(
      Array.from(Array(6), (_, i) => ({ instance: `server${i}` }))
    );
    expect(tree.find(".pagination")).toHaveLength(1);
  });

  it("clicking on pagination changes displayed elements", () => {
    const tree = MountedLabelSetList(
      Array.from(Array(21), (_, i) => ({ instance: `server${i + 1}` }))
    );
    const pageLink = tree.find(".page-link").at(3);
    pageLink.simulate("click");
    expect(tree.find("ul.list-group").text()).toBe("instance: server21");
  });
});

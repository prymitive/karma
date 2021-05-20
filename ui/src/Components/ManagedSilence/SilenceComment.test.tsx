import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import toDiffableHtml from "diffable-html";

import { MockSilence } from "__fixtures__/Alerts";
import { APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceComment } from "./SilenceComment";

let silence: APISilenceT;
let alertStore: AlertStore;

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));

  silence = MockSilence();
  alertStore = new AlertStore([]);
});

afterEach(() => {
  jest.restoreAllMocks();
  clear();
});

const CollapseMock = jest.fn();

const MountedSilenceComment = (collapsed: boolean, cluster?: string) => {
  return mount(
    <SilenceComment
      alertStore={alertStore}
      alertCount={123}
      cluster={cluster || "default"}
      silence={silence}
      collapsed={collapsed}
      collapseToggle={CollapseMock}
    />
  );
};

const MockMultipleClusters = () => {
  alertStore.data.setUpstreams({
    counters: { total: 2, healthy: 2, failed: 0 },
    clusters: { ha: ["ha1", "ha2"], single: ["single"] },
    instances: [
      {
        name: "ha1",
        uri: "http://ha1.example.com",
        publicURI: "http://ha1.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "ha",
        clusterMembers: ["ha1", "ha2"],
      },
      {
        name: "ha2",
        uri: "http://ha2.example.com",
        publicURI: "http://ha2.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "ha",
        clusterMembers: ["ha1", "ha2"],
      },
      {
        name: "single",
        uri: "http://single.example.com",
        publicURI: "http://single.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "single",
        clusterMembers: ["single"],
      },
    ],
  });
};

describe("<SilenceComment />", () => {
  it("Matches snapshot when collapsed", () => {
    const tree = MountedSilenceComment(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Matches snapshot when expanded", () => {
    const tree = MountedSilenceComment(false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Matches snapshot when collapsed and multiple clusters are present", () => {
    MockMultipleClusters();
    const tree = MountedSilenceComment(true, "ha");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Matches snapshot when expanded and multiple clusters are present", () => {
    MockMultipleClusters();
    const tree = MountedSilenceComment(false, "ha");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Renders a JIRA link if present", () => {
    silence.ticketURL = "http://localhost/1234";
    silence.ticketID = "1234";
    silence.comment = "Ticket id 1234 and also 1234";
    const tree = MountedSilenceComment(true);
    expect(tree.find("a[href='http://localhost/1234']")).toHaveLength(2);
  });

  it("Renders a JIRA link if present and comment is expanded", () => {
    silence.ticketURL = "http://localhost/1234";
    silence.ticketID = "1234";
    silence.comment = "Ticket id 1234";
    const tree = MountedSilenceComment(false);
    expect(tree.find("a[href='http://localhost/1234']")).toHaveLength(1);
  });

  it("collapseToggle is called when collapse icon is clicked", () => {
    const tree = MountedSilenceComment(true);
    const collapse = tree.find("svg.fa-chevron-down");
    collapse.simulate("click");
    expect(CollapseMock).toHaveBeenCalled();
  });

  it("Doesn't render cluster badges when collapsed and only a single cluster is present", () => {
    const tree = MountedSilenceComment(true);
    const ams = tree.find("span.badge.bg-secondary");
    expect(ams).toHaveLength(0);
  });

  it("Doesn't render cluster badges when expanded and only a single cluster is present", () => {
    const tree = MountedSilenceComment(false);
    const ams = tree.find("span.badge.bg-secondary");
    expect(ams).toHaveLength(0);
  });

  it("Renders cluster badge when collapsed and multiple clusters are present", () => {
    MockMultipleClusters();
    const tree = MountedSilenceComment(true, "single");
    const ams = tree.find("span.badge.bg-secondary");
    expect(ams).toHaveLength(1);
    expect(toDiffableHtml(ams.at(0).html())).toMatch(/single/);
  });

  it("Doesn't render cluster badge when expanded and multiple clusters are present", () => {
    MockMultipleClusters();
    const tree = MountedSilenceComment(false, "single");
    const ams = tree.find("span.badge.bg-secondary");
    expect(ams).toHaveLength(0);
  });
});

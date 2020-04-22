import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockSilence } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { SilenceComment } from "./SilenceComment";

let silence;
let alertStore;

beforeEach(() => {
  silence = MockSilence();
  alertStore = new AlertStore([]);
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
});

const CollapseMock = jest.fn();

const MountedSilenceComment = (collapsed) => {
  return mount(
    <SilenceComment
      alertStore={alertStore}
      alertCount={123}
      cluster="default"
      silence={silence}
      collapsed={collapsed}
      collapseToggle={CollapseMock}
    />
  );
};

const MockMultipleClusters = () => {
  alertStore.data.upstreams = {
    clusters: { default: ["default", "fallback"], second: ["second"] },
    instances: [
      {
        name: "default",
        uri: "http://am1.example.com",
        publicURI: "http://am1.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "default",
        clusterMembers: ["default", "fallback"],
      },
      {
        name: "fallback",
        uri: "http://am2.example.com",
        publicURI: "http://am2.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "default",
        clusterMembers: ["default", "fallback"],
      },
      {
        name: "second",
        uri: "http://am3.example.com",
        publicURI: "http://am3.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "second",
        clusterMembers: ["second"],
      },
    ],
  };
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
    const tree = MountedSilenceComment(true);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Matches snapshot when collapsed and multiple clusters are present", () => {
    MockMultipleClusters();
    const tree = MountedSilenceComment(false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("Renders a JIRA link if present", () => {
    silence.ticketURL = "http://localhost/1234";
    silence.ticketID = "1234";
    const tree = MountedSilenceComment(true);
    expect(tree.find("a[href='http://localhost/1234']")).toHaveLength(1);
  });

  it("Renders a JIRA link if present and comment is expanded", () => {
    silence.ticketURL = "http://localhost/1234";
    silence.ticketID = "1234";
    const tree = MountedSilenceComment(false);
    expect(tree.find("a[href='http://localhost/1234']")).toHaveLength(1);
  });

  it("collapseToggle is called when collapse icon is clicked", () => {
    const tree = MountedSilenceComment(true);
    const collapse = tree.find("svg.fa-chevron-down");
    collapse.simulate("click");
    expect(CollapseMock).toHaveBeenCalled();
  });

  it("Doesn't render alertmanager badges when collapsed and only a single cluster is present", () => {
    const tree = MountedSilenceComment(true);
    const ams = tree.find("span.badge.badge-secondary");
    expect(ams).toHaveLength(0);
  });

  it("Doesn't render alertmanager badges when expanded and only a single cluster is present", () => {
    const tree = MountedSilenceComment(false);
    const ams = tree.find("span.badge.badge-secondary");
    expect(ams).toHaveLength(0);
  });

  it("Renders alertmanager badges when collapsed and multiple clusters are present", () => {
    MockMultipleClusters();
    const tree = MountedSilenceComment(true);
    const ams = tree.find("span.badge.badge-secondary");
    expect(ams).toHaveLength(2);
    expect(toDiffableHtml(ams.at(0).html())).toMatch(/default/);
    expect(toDiffableHtml(ams.at(1).html())).toMatch(/fallback/);
  });

  it("Doesn't render alertmanager badges when expanded and multiple clusters are present", () => {
    MockMultipleClusters();
    const tree = MountedSilenceComment(false);
    const ams = tree.find("span.badge.badge-secondary");
    expect(ams).toHaveLength(0);
  });
});

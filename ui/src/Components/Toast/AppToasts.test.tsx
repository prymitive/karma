import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import AppToasts from "./AppToasts";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const makeErrors = () => {
  alertStore.data.setUpstreams({
    counters: { total: 3, healthy: 1, failed: 2 },
    instances: [
      {
        name: "am1",
        cluster: "am",
        clusterMembers: ["am1"],
        uri: "http://am1",
        publicURI: "http://am1",
        error: "error 1",
        version: "0.21.0",
        readonly: false,
        corsCredentials: "include",
        headers: {},
      },
      {
        name: "am2",
        cluster: "am",
        clusterMembers: ["am2"],
        uri: "file:///mock",
        publicURI: "file:///mock",
        error: "",
        version: "0.21.0",
        readonly: false,
        corsCredentials: "include",
        headers: {},
      },
      {
        name: "am3",
        cluster: "am",
        clusterMembers: ["am3"],
        uri: "http://am3",
        publicURI: "http://am3",
        error: "error 2",
        version: "0.21.0",
        readonly: false,
        corsCredentials: "include",
        headers: {},
      },
    ],
    clusters: { am1: ["am1"], am2: ["am2"], am3: ["am3"] },
  });
};

describe("<AppToasts />", () => {
  it("doesn't render anything when alertStore.info.upgradeNeeded=true", () => {
    alertStore.info.setUpgradeNeeded(true);
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.html()).toBe("");
  });

  it("doesn't render anything when there are no notifications to show", () => {
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.html()).toBe("");
  });

  it("renders upstream error toasts for each unhealthy upstream", () => {
    makeErrors();
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("Toast")).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("removes notifications when upstream recovers", () => {
    makeErrors();
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("Toast")).toHaveLength(2);

    alertStore.data.setUpstreams({
      counters: { total: 3, healthy: 3, failed: 0 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1"],
          uri: "http://am1",
          publicURI: "http://am1",
          error: "",
          version: "0.21.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "am2",
          cluster: "am",
          clusterMembers: ["am2"],
          uri: "file:///mock",
          publicURI: "file:///mock",
          error: "",
          version: "0.21.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "am3",
          cluster: "am",
          clusterMembers: ["am3"],
          uri: "http://am3",
          publicURI: "http://am3",
          error: "",
          version: "0.21.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"], am2: ["am2"], am3: ["am3"] },
    });
    tree.update();
    expect(tree.find("Toast")).toHaveLength(0);
  });

  it("clicking navbar icon toggles all notifications", () => {
    makeErrors();
    alertStore.info.setUpgradeNeeded(false);
    alertStore.info.setUpgradeReady(false);
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("div.bg-toast")).toHaveLength(2);
    expect(tree.find("span.badge.cursor-pointer.with-click")).toHaveLength(2);

    tree.find("span.badge.cursor-pointer.with-click").at(1).simulate("click");
    expect(tree.find("div.bg-toast")).toHaveLength(1);

    tree.find("span#components-notifications").simulate("click");
    tree.update();
    expect(tree.find("div.bg-toast")).toHaveLength(2);
  });

  it("renders UpgradeToastMessage when alertStore.info.upgradeReady=true", () => {
    alertStore.info.setUpgradeReady(true);
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("UpgradeToastMessage")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

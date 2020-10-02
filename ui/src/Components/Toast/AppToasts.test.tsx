import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { AppToasts } from "./AppToasts";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

describe("<AppToasts />", () => {
  it("doesn't render anything when alertStore.info.upgradeNeeded=true", () => {
    alertStore.info.upgradeNeeded = true;
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.html()).toBeNull();
  });

  it("renders upstream error toasts for each unhealthy upstream", () => {
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
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("Toast")).toHaveLength(2);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders UpgradeToastMessage when alertStore.info.upgradeReady=true", () => {
    alertStore.info.upgradeReady = true;
    const tree = mount(<AppToasts alertStore={alertStore} />);
    expect(tree.find("UpgradeToastMessage")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

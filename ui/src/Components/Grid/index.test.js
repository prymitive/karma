import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Grid } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;

let originalInnerWidth;

beforeAll(() => {
  originalInnerWidth = global.innerWidth;
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
});

afterEach(() => {
  global.innerWidth = originalInnerWidth;
});

const ShallowGrid = () => {
  return shallow(
    <Grid
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

describe("<Grid />", () => {
  it("renders only AlertGrid when all upstreams are healthy", () => {
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<AlertGrid />");
  });

  it("renders FatalError if there's only one upstream and it's unhealthy", () => {
    alertStore.data.upstreams = {
      counters: { total: 1, healthy: 0, failed: 1 },
      instances: [{ name: "am1", uri: "http://am1", error: "error" }],
      clusters: { am1: ["am1"] },
    };
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<FatalError />");
  });

  it("renders FatalError if there's only one upstream and it's unhealthy but without any error", () => {
    alertStore.data.upstreams = {
      counters: { total: 1, healthy: 0, failed: 1 },
      instances: [{ name: "am1", uri: "http://am1", error: "" }],
      clusters: { am1: ["am1"] },
    };
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<AlertGrid />");
  });

  it("renders UpstreamError for each unhealthy upstream", () => {
    alertStore.data.upstreams = {
      counters: { total: 3, healthy: 1, failed: 2 },
      instances: [
        { name: "am1", uri: "http://am1", error: "error 1" },
        { name: "am2", uri: "file:///mock", error: "" },
        { name: "am3", uri: "http://am1", error: "error 2" },
      ],
      clusters: { am1: ["am1"], am2: ["am2"], am3: ["am3"] },
    };
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<UpstreamError /><UpstreamError /><AlertGrid />");
  });

  it("renders only FatalError on failed fetch", () => {
    alertStore.status.error = "error";
    alertStore.data.upstreams = {
      counters: { total: 0, healthy: 0, failed: 1 },
      instances: [{ name: "am", uri: "http://am1", error: "error" }],
      clusters: { am1: ["am1"] },
    };
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<FatalError />");
  });

  it("renders UpgradeNeeded when alertStore.info.upgradeNeeded=true", () => {
    alertStore.info.upgradeNeeded = true;
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<UpgradeNeeded />");
  });

  it("renders ReloadNeeded when alertStore.info.reloadNeeded=true", () => {
    alertStore.info.reloadNeeded = true;
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<ReloadNeeded />");
  });

  it("renders AlertGrid before any fetch finished when totalAlerts is 0", () => {
    alertStore.info.version = "unknown";
    alertStore.info.totalAlerts = 0;
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<AlertGrid />");
  });

  it("renders EmptyGrid after first fetch when totalAlerts is 0", () => {
    alertStore.info.version = "1.2.3";
    alertStore.info.totalAlerts = 0;
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<EmptyGrid />");
  });

  it("renders AlertGrid after first fetch finished when totalAlerts is >0", () => {
    alertStore.info.version = "unknown";
    alertStore.info.totalAlerts = 1;
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<AlertGrid />");
  });

  it("unmounts without crashes", () => {
    const tree = ShallowGrid();
    tree.unmount();
  });
});

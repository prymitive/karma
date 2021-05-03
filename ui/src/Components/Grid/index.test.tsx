import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import Grid from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;

let originalInnerWidth: number;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();

  originalInnerWidth = global.innerWidth;
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
    expect(tree.find("AlertGrid")).toHaveLength(1);
  });

  it("renders FatalError if there's only one upstream and it's unhealthy", () => {
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am"],
          uri: "http://am1",
          publicURI: "http://am1",
          error: "error",
          version: "0.21.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"] },
    });
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<FatalError />");
  });

  it("renders FatalError if there's only one upstream and it's unhealthy but without any error", () => {
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am"],
          uri: "http://am1",
          publicURI: "http://am1",
          error: "error",
          version: "0.21.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"] },
    });
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<FatalError />");
  });

  it("renders only FatalError on failed fetch", () => {
    alertStore.status.setError("error");
    alertStore.data.setUpstreams({
      counters: { total: 0, healthy: 0, failed: 1 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am"],
          uri: "http://am1",
          publicURI: "http://am1",
          error: "error",
          version: "0.21.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"] },
    });
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<FatalError />");
  });

  it("renders UpgradeNeeded when alertStore.info.upgradeNeeded=true", () => {
    alertStore.info.setUpgradeNeeded(true);
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<UpgradeNeeded />");
  });

  it("renders ReloadNeeded when alertStore.info.reloadNeeded=true", () => {
    alertStore.info.setReloadNeeded(true);
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<ReloadNeeded />");
  });

  it("renders AlertGrid before any fetch finished when totalAlerts is 0", () => {
    alertStore.info.setVersion("unknown");
    alertStore.info.setTotalAlerts(0);
    const tree = ShallowGrid();
    expect(tree.find("AlertGrid")).toHaveLength(1);
  });

  it("renders EmptyGrid after first fetch when totalAlerts is 0", () => {
    alertStore.info.setVersion("1.2.3");
    alertStore.info.setTotalAlerts(0);
    const tree = ShallowGrid();
    expect(tree.text()).toBe("<EmptyGrid />");
  });

  it("renders AlertGrid after first fetch finished when totalAlerts is >0", () => {
    alertStore.info.setVersion("unknown");
    alertStore.info.setTotalAlerts(1);
    const tree = ShallowGrid();
    expect(tree.find("AlertGrid")).toHaveLength(1);
  });

  it("unmounts without crashes", () => {
    const tree = ShallowGrid();
    tree.unmount();
  });
});

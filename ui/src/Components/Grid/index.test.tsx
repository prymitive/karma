import { render, screen } from "@testing-library/react";

import { mockMatchMedia } from "__fixtures__/matchMedia";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import Grid from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;

let originalInnerWidth: number;

declare let global: any;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();

  originalInnerWidth = global.innerWidth;

  global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  }));
  global.ResizeObserverEntry = jest.fn();

  window.matchMedia = mockMatchMedia({});
});

afterEach(() => {
  global.innerWidth = originalInnerWidth;
});

const renderGrid = () => {
  return render(
    <Grid
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />,
  );
};

const setupGrids = () => {
  alertStore.data.setGrids([
    {
      labelName: "",
      labelValue: "",
      alertGroups: [],
      totalGroups: 0,
      stateCount: { unprocessed: 0, suppressed: 0, active: 0 },
    },
  ]);
};

describe("<Grid />", () => {
  it("renders only AlertGrid when all upstreams are healthy", () => {
    setupGrids();
    const { container } = renderGrid();
    expect(container.querySelector(".components-grid")).toBeInTheDocument();
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
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"] },
    });
    renderGrid();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders AlertGrid if there's only one upstream and it's unhealthy but there are alerts", () => {
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
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"] },
    });
    alertStore.info.setTotalAlerts(1);
    setupGrids();
    const { container } = renderGrid();
    expect(container.querySelector(".components-grid")).toBeInTheDocument();
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
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"] },
    });
    renderGrid();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders only FatalError on failed fetch", () => {
    alertStore.status.setError("fetch error");
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
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
      clusters: { am1: ["am1"] },
    });
    renderGrid();
    expect(screen.getByText("fetch error")).toBeInTheDocument();
  });

  it("renders UpgradeNeeded when alertStore.info.upgradeNeeded=true", () => {
    alertStore.info.setUpgradeNeeded(true);
    renderGrid();
    expect(screen.getByText(/new version/i)).toBeInTheDocument();
  });

  it("renders ReloadNeeded when alertStore.info.reloadNeeded=true", () => {
    alertStore.info.setReloadNeeded(true);
    renderGrid();
    expect(screen.getByText(/reload/i)).toBeInTheDocument();
  });

  it("renders AlertGrid before any fetch finished when totalAlerts is 0", () => {
    alertStore.info.setVersion("unknown");
    alertStore.info.setTotalAlerts(0);
    setupGrids();
    const { container } = renderGrid();
    expect(container.querySelector(".components-grid")).toBeInTheDocument();
  });

  it("renders EmptyGrid after first fetch when totalAlerts is 0", () => {
    alertStore.info.setVersion("1.2.3");
    alertStore.info.setTotalAlerts(0);
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 1, failed: 1 },
      instances: [
        {
          name: "dev",
          cluster: "dev",
          clusterMembers: ["dev"],
          uri: "https://am.example.com",
          publicURI: "https://am.example.com",
          error: "",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          version: "",
        },
      ],
      clusters: { dev: ["dev"] },
    });
    const { container } = renderGrid();
    expect(container.querySelector(".fa-mug-hot")).toBeInTheDocument();
  });

  it("renders NoUpstream after first fetch when upstream list is empty", () => {
    alertStore.info.setVersion("1.2.3");
    alertStore.info.setTotalAlerts(0);
    alertStore.data.setUpstreams({
      counters: { total: 0, healthy: 0, failed: 0 },
      instances: [],
      clusters: {},
    });
    renderGrid();
    expect(
      screen.getByText(/No alertmanager server configured/i),
    ).toBeInTheDocument();
  });

  it("renders AlertGrid after first fetch finished when totalAlerts is >0", () => {
    alertStore.info.setVersion("unknown");
    alertStore.info.setTotalAlerts(1);
    setupGrids();
    const { container } = renderGrid();
    expect(container.querySelector(".components-grid")).toBeInTheDocument();
  });

  it("unmounts without crashes", () => {
    const { unmount } = renderGrid();
    unmount();
  });
});

import { act } from "react-dom/test-utils";

import { render } from "@testing-library/react";

import {
  MockAlert,
  MockAnnotation,
  MockAlertGroup,
  MockSilence,
} from "__fixtures__/Alerts";
import { MockThemeContext } from "__fixtures__/Theme";
import type { APIAlertGroupT, APIAlertT, APIGridT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { BorderClassMap } from "Common/Colors";
import { ThemeContext } from "Components/Theme";
import Alert from ".";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;
let grid: APIGridT;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(Date.UTC(2018, 7, 15, 20, 40, 0)));
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  grid = {
    labelName: "foo",
    labelValue: "bar",
    alertGroups: [],
    totalGroups: 0,
    stateCount: {
      active: 0,
      suppressed: 0,
      unprocessed: 0,
    },
  };
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const MockAfterUpdate = jest.fn();
const MockSetIsMenuOpen = jest.fn();

const MockedAlert = () => {
  return MockAlert(
    [
      MockAnnotation("help", "some long text", true, false, false),
      MockAnnotation("hidden", "some hidden text", false, false, false),
      MockAnnotation("link", "http://localhost", true, true, false),
    ],
    [
      { name: "job", value: "node_exporter" },
      { name: "cluster", value: "dev" },
    ],
    "active",
  );
};

const renderAlert = (
  alert: APIAlertT,
  group: APIAlertGroupT,
  showReceiver: boolean,
  showOnlyExpandedAnnotations: boolean,
) => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <Alert
        grid={grid}
        alert={alert}
        group={group}
        showReceiver={showReceiver}
        showOnlyExpandedAnnotations={showOnlyExpandedAnnotations}
        afterUpdate={MockAfterUpdate}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        setIsMenuOpen={MockSetIsMenuOpen}
      />
    </ThemeContext.Provider>,
  );
};

describe("<Alert />", () => {
  it("matches snapshot with showAlertmanagers=false showReceiver=false", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup([], [alert], [], [], {});
    group.shared.clusters = ["default"];
    const { asFragment } = renderAlert(alert, group, false, false);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot when inhibited", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].inhibitedBy = ["123456"];
    const group = MockAlertGroup([], [alert], [], [], {});
    group.shared.clusters = ["default"];
    const { asFragment } = renderAlert(alert, group, false, false);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders inhibition icon when inhibited", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].inhibitedBy = ["123456"];
    alert.alertmanager.push({
      fingerprint: "abc",
      name: "ha2",
      cluster: "HA",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "http://localhost/graph",
      silencedBy: [],
      inhibitedBy: ["123456"],
    });
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    expect(container.querySelectorAll(".fa-volume-xmark")).toHaveLength(1);
  });

  it("inhibition icon passes only unique fingerprints", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].inhibitedBy = ["123456"];
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    expect(container.querySelectorAll(".fa-volume-xmark")).toHaveLength(1);
  });

  it("renders @cluster label for non-shared clusters", () => {
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { default: ["default"], second: ["second"] },
      instances: [
        {
          name: "default",
          cluster: "default",
          clusterMembers: ["default"],
          uri: "http://localhost",
          publicURI: "http://localhost",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "second",
          cluster: "second",
          clusterMembers: ["second"],
          uri: "http://localhost",
          publicURI: "http://localhost",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
    });

    const alert = MockedAlert();
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    expect(container.textContent).toMatch(/@cluster:.*default/);
  });

  it("only renders one @cluster label per alertmanager cluster", () => {
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { default: ["default"], second: ["second"] },
      instances: [
        {
          name: "default",
          cluster: "default",
          clusterMembers: ["default"],
          uri: "http://localhost",
          publicURI: "http://localhost",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "HA",
          cluster: "HA",
          clusterMembers: ["HA"],
          uri: "http://localhost",
          publicURI: "http://localhost",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
      ],
    });
    const alert = MockedAlert();
    alert.alertmanager.push({
      fingerprint: "123",
      name: "ha1",
      cluster: "HA",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "http://localhost/graph",
      silencedBy: [],
      inhibitedBy: [],
    });
    alert.alertmanager.push({
      fingerprint: "123",
      name: "ha2",
      cluster: "HA",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "http://localhost/graph",
      silencedBy: [],
      inhibitedBy: [],
    });
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    expect(container.textContent).toMatch(/@cluster:.*default/);
    expect(container.textContent).toMatch(/@cluster:.*HA/);
  });

  it("renders @receiver label with showReceiver=true", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, true, false);
    expect(container.textContent).toMatch(/@receiver:.*by-name/);
  });

  it("renders a silence if alert is silenced", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    alertStore.data.setSilences({
      default: {
        silence123456789: MockSilence(),
      },
    });
    const group = MockAlertGroup([], [alert], [], [], { default: [] });
    const { container } = renderAlert(alert, group, false, false);
    expect(container.innerHTML).toMatch(/Mocked Silence/);
  });

  it("renders a fallback silence if the silence is not found in alertStore", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    alertStore.data.setSilences({
      default: {
        "123": MockSilence(),
      },
    });
    const group = MockAlertGroup([], [alert], [], [], { default: [] });
    const { container } = renderAlert(alert, group, false, false);
    expect(container.innerHTML).not.toMatch(/Mocked Silence/);
    expect(container.innerHTML).toMatch(/silence123456789/);
  });

  it("renders a fallback silence if the cluster is not found in alertStore", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    alertStore.data.setSilences({
      foo: {
        "123": MockSilence(),
      },
    });
    const group = MockAlertGroup([], [alert], [], [], { default: [] });
    const { container } = renderAlert(alert, group, false, false);
    expect(container.innerHTML).not.toMatch(/Mocked Silence/);
    expect(container.innerHTML).toMatch(/silence123456789/);
  });

  it("renders only one silence for HA cluster", () => {
    const alert = MockedAlert();
    alert.alertmanager = [
      {
        fingerprint: "123",
        name: "am1",
        cluster: "ha",
        state: "suppressed",
        startsAt: "2018-08-14T17:36:40.017867056Z",
        source: "localhost/am1",
        silencedBy: ["silence123456789"],
        inhibitedBy: [],
      },
      {
        fingerprint: "123",
        name: "am2",
        cluster: "ha",
        state: "suppressed",
        startsAt: "2018-08-14T17:36:40.017867056Z",
        source: "localhost/am2",
        silencedBy: ["silence123456789"],
        inhibitedBy: [],
      },
    ];
    alertStore.data.setSilences({
      ha: {
        silence123456789: MockSilence(),
      },
    });
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    expect(container.innerHTML).toMatch(/Mocked Silence/);
  });

  it("doesn't render shared silences", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    const group = MockAlertGroup([], [alert], [], [], {
      default: ["silence123456789"],
    });
    const { container } = renderAlert(alert, group, false, false);
    expect(container.innerHTML).not.toMatch(/Mocked Silence/);
  });

  it("renders collapsed annotations when showOnlyExpandedAnnotations=false", () => {
    const alert = MockedAlert();
    alert.annotations = [
      {
        name: "visible",
        value: "1",
        visible: true,
        isLink: false,
        isAction: false,
      },
      {
        name: "invisible",
        value: "2",
        visible: false,
        isLink: false,
        isAction: false,
      },
    ];
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    const annotations = container.querySelectorAll(
      "div.components-grid-annotation",
    );
    expect(annotations).toHaveLength(2);
  });

  it("doesn't render collapsed annotations when showOnlyExpandedAnnotations=true", () => {
    const alert = MockedAlert();
    alert.annotations = [
      {
        name: "visible",
        value: "1",
        visible: true,
        isLink: false,
        isAction: false,
      },
      {
        name: "invisible",
        value: "2",
        visible: false,
        isLink: false,
        isAction: false,
      },
    ];
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, true);
    const annotations = container.querySelectorAll(
      "div.components-grid-annotation",
    );
    expect(annotations).toHaveLength(1);
  });

  it("uses BorderClassMap.active when @state=active", () => {
    const alert = MockedAlert();
    alert.state = "active";
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    const alertEl = container.querySelector(
      ".components-grid-alertgrid-alertgroup-alert",
    );
    expect(alertEl?.classList.contains(BorderClassMap.active)).toBe(true);
  });

  it("uses BorderClassMap.suppressed when @state=suppressed", () => {
    const alert = MockedAlert();
    alert.state = "suppressed";
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    const alertEl = container.querySelector(
      ".components-grid-alertgrid-alertgroup-alert",
    );
    expect(alertEl?.classList.contains(BorderClassMap.suppressed)).toBe(true);
  });

  it("uses BorderClassMap.unprocessed when @state=unprocessed", () => {
    const alert = MockedAlert();
    alert.state = "unprocessed";
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    const alertEl = container.querySelector(
      ".components-grid-alertgrid-alertgroup-alert",
    );
    expect(alertEl?.classList.contains(BorderClassMap.unprocessed)).toBe(true);
  });

  it("uses 'border-default' with unknown @state", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const alert = MockedAlert();
    (alert.state as string) = "foobar";
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    const alertEl = container.querySelector(
      ".components-grid-alertgrid-alertgroup-alert",
    );
    expect(alertEl?.classList.contains("border-default")).toBe(true);
  });

  it("alert timestamp is updated every minute", () => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date(Date.UTC(2018, 7, 14, 17, 36, 41)));

    const alert = MockedAlert();
    const group = MockAlertGroup([], [alert], [], [], {});
    const { container } = renderAlert(alert, group, false, false);
    const getTimestamp = () =>
      container.querySelector(
        "span.components-label.badge.bg-secondary.cursor-pointer",
      )?.textContent;
    expect(getTimestamp()).toBe("just now");

    jest.setSystemTime(new Date(Date.UTC(2018, 7, 14, 17, 36, 42)));
    act(() => {
      jest.advanceTimersByTime(31 * 1000);
    });
    expect(getTimestamp()).toBe("a few seconds ago");

    jest.setSystemTime(new Date(Date.UTC(2018, 7, 14, 17, 37, 41)));
    act(() => {
      jest.advanceTimersByTime(31 * 1000);
    });
    expect(getTimestamp()).toBe("1 minute ago");

    jest.setSystemTime(new Date(Date.UTC(2018, 7, 14, 18, 36, 41)));
    act(() => {
      jest.advanceTimersByTime(31 * 1000);
    });
    expect(getTimestamp()).toBe("1 hour ago");

    jest.setSystemTime(new Date(Date.UTC(2018, 7, 14, 19, 36, 41)));
    act(() => {
      jest.advanceTimersByTime(31 * 1000);
    });
    expect(getTimestamp()).toBe("2 hours ago");

    jest.setSystemTime(new Date(Date.UTC(2018, 7, 16, 19, 36, 41)));
    act(() => {
      jest.advanceTimersByTime(31 * 1000);
    });
    expect(getTimestamp()).toBe("2 days ago");
  });
});

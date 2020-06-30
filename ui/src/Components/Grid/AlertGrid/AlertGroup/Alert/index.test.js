import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import toDiffableHtml from "diffable-html";

import {
  MockAlert,
  MockAnnotation,
  MockAlertGroup,
  MockSilence,
} from "__mocks__/Alerts";
import { MockThemeContext } from "__mocks__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { BorderClassMap } from "Common/Colors";
import { ThemeContext } from "Components/Theme";
import { Alert } from ".";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2018, 7, 15, 20, 40, 0)));
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
});

afterEach(() => {
  // reset Date() to current time
  clear();
  jest.restoreAllMocks();
});

const MockAfterUpdate = jest.fn();
const MockSetIsMenuOpen = jest.fn();

const MockedAlert = () => {
  return MockAlert(
    [
      MockAnnotation("help", "some long text", true, false),
      MockAnnotation("hidden", "some hidden text", false, false),
      MockAnnotation("link", "http://localhost", true, true),
    ],
    { job: "node_exporter", cluster: "dev" },
    "active"
  );
};

const MountedAlert = (alert, group, showAlertmanagers, showReceiver) => {
  return mount(
    <Alert
      alert={alert}
      group={group}
      showAlertmanagers={showAlertmanagers}
      showReceiver={showReceiver}
      afterUpdate={MockAfterUpdate}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      setIsMenuOpen={MockSetIsMenuOpen}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

describe("<Alert />", () => {
  it("matches snapshot with showAlertmanagers=false showReceiver=false", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when inhibited", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].inhibitedBy = ["123456"];
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders inhibition icon when inhibited", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].inhibitedBy = ["123456"];
    alert.alertmanager.push({
      name: "ha2",
      cluster: "HA",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "localhost/prometheus",
      silencedBy: [],
      inhibitedBy: ["123456"],
    });
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(tree.find(".fa-volume-mute")).toHaveLength(1);
  });

  it("inhibition icon passes only unique fingerprints", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].inhibitedBy = ["123456"];
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(tree.find(".fa-volume-mute")).toHaveLength(1);
  });

  it("renders @cluster label with showAlertmanagers=true", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, true, false);
    const label = tree
      .find("FilteringLabel")
      .filterWhere((elem) => elem.props().name === "@cluster");
    expect(label.text()).toBe("@cluster: default");
  });

  it("only renders one @cluster label per alertmanager cluster", () => {
    const alert = MockedAlert();
    alert.alertmanager.push({
      name: "ha1",
      cluster: "HA",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "localhost/prometheus",
      silencedBy: [],
      inhibitedBy: [],
    });
    alert.alertmanager.push({
      name: "ha2",
      cluster: "HA",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "localhost/prometheus",
      silencedBy: [],
      inhibitedBy: [],
    });
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, true, false);
    const labels = tree
      .find("FilteringLabel")
      .filterWhere((elem) => elem.props().name === "@cluster");
    expect(labels).toHaveLength(2);
    expect(labels.at(0).text()).toBe("@cluster: default");
    expect(labels.at(1).text()).toBe("@cluster: HA");
  });

  it("renders @receiver label with showReceiver=true", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, true);
    const label = tree
      .find("FilteringLabel")
      .filterWhere((elem) => elem.props().name === "@receiver");
    expect(label.text()).toBe("@receiver: by-name");
  });

  it("renders a silence if alert is silenced", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    alertStore.data.silences = {
      default: {
        silence123456789: MockSilence(),
      },
    };
    const group = MockAlertGroup({}, [alert], [], {}, { default: [] });
    const tree = MountedAlert(alert, group, false, false);
    const silence = tree.find("ManagedSilence");
    expect(silence).toHaveLength(1);
    expect(silence.html()).toMatch(/Mocked Silence/);
  });

  it("renders a fallback silence if the silence is not found in alertStore", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    alertStore.data.silences = {
      default: {
        "123": MockSilence(),
      },
    };
    const group = MockAlertGroup({}, [alert], [], {}, { default: [] });
    const tree = MountedAlert(alert, group, false, false);
    const silence = tree.find("FallbackSilenceDesciption");
    expect(silence).toHaveLength(1);
    expect(silence.html()).not.toMatch(/Mocked Silence/);
  });

  it("renders a fallback silence if the cluster is not found in alertStore", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    alertStore.data.silences = {
      foo: {
        "123": MockSilence(),
      },
    };
    const group = MockAlertGroup({}, [alert], [], {}, { default: [] });
    const tree = MountedAlert(alert, group, false, false);
    const silence = tree.find("FallbackSilenceDesciption");
    expect(silence).toHaveLength(1);
    expect(silence.html()).not.toMatch(/Mocked Silence/);
  });

  it("renders only one silence for HA cluster", () => {
    const alert = MockedAlert();
    alert.alertmanager = [
      {
        name: "am1",
        cluster: "ha",
        state: "suppressed",
        startsAt: "2018-08-14T17:36:40.017867056Z",
        source: "localhost/am1",
        silencedBy: ["silence123456789"],
        inhibitedBy: [],
      },
      {
        name: "am2",
        cluster: "ha",
        state: "suppressed",
        startsAt: "2018-08-14T17:36:40.017867056Z",
        source: "localhost/am2",
        silencedBy: ["silence123456789"],
        inhibitedBy: [],
      },
    ];
    alertStore.data.silences = {
      ha: {
        silence123456789: MockSilence(),
      },
    };
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    const silence = tree.find("ManagedSilence");
    expect(silence).toHaveLength(1);
    expect(silence.html()).toMatch(/Mocked Silence/);
  });

  it("doesn't render shared silences", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    const group = MockAlertGroup(
      {},
      [alert],
      [],
      {},
      { default: ["silence123456789"] }
    );
    const tree = MountedAlert(alert, group, false, false);
    const silence = tree.find("ManagedSilence");
    expect(silence).toHaveLength(0);
  });

  it("uses BorderClassMap.active when @state=active", () => {
    const alert = MockedAlert();
    alert.state = "active";
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(
      tree
        .find(".components-grid-alertgrid-alertgroup-alert")
        .hasClass(BorderClassMap.active)
    ).toBe(true);
  });

  it("uses BorderClassMap.suppressed when @state=suppressed", () => {
    const alert = MockedAlert();
    alert.state = "suppressed";
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(
      tree
        .find(".components-grid-alertgrid-alertgroup-alert")
        .hasClass(BorderClassMap.suppressed)
    ).toBe(true);
  });

  it("uses BorderClassMap.unprocessed when @state=unprocessed", () => {
    const alert = MockedAlert();
    alert.state = "unprocessed";
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(
      tree
        .find(".components-grid-alertgrid-alertgroup-alert")
        .hasClass(BorderClassMap.unprocessed)
    ).toBe(true);
  });

  it("uses 'border-default' with unknown @state", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const alert = MockedAlert();
    alert.state = "foobar";
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(
      tree
        .find(".components-grid-alertgrid-alertgroup-alert")
        .hasClass("border-default")
    ).toBe(true);
  });

  it("alert timestamp is updated every minute", () => {
    jest.useFakeTimers();

    advanceTo(new Date(Date.UTC(2018, 7, 14, 17, 36, 41)));

    const alert = MockedAlert();
    const group = MockAlertGroup({}, [alert], [], {}, {});
    const tree = MountedAlert(alert, group, false, false);
    expect(
      tree
        .find("span.components-label.badge.badge-secondary.cursor-pointer")
        .at(0)
        .text()
    ).toBe("just now");

    advanceTo(new Date(Date.UTC(2018, 7, 14, 17, 36, 42)));
    act(() => jest.advanceTimersByTime(31 * 1000));
    expect(
      tree
        .find("span.components-label.badge.badge-secondary.cursor-pointer")
        .at(0)
        .text()
    ).toBe("a few seconds ago");

    advanceTo(new Date(Date.UTC(2018, 7, 14, 17, 37, 41)));
    act(() => jest.advanceTimersByTime(31 * 1000));
    expect(
      tree
        .find("span.components-label.badge.badge-secondary.cursor-pointer")
        .at(0)
        .text()
    ).toBe("1 minute ago");

    advanceTo(new Date(Date.UTC(2018, 7, 14, 18, 36, 41)));
    act(() => jest.advanceTimersByTime(31 * 1000));
    expect(
      tree
        .find("span.components-label.badge.badge-secondary.cursor-pointer")
        .at(0)
        .text()
    ).toBe("1 hour ago");

    advanceTo(new Date(Date.UTC(2018, 7, 14, 19, 36, 41)));
    act(() => jest.advanceTimersByTime(31 * 1000));
    expect(
      tree
        .find("span.components-label.badge.badge-secondary.cursor-pointer")
        .at(0)
        .text()
    ).toBe("2 hours ago");

    advanceTo(new Date(Date.UTC(2018, 7, 16, 19, 36, 41)));
    act(() => jest.advanceTimersByTime(31 * 1000));
    expect(
      tree
        .find("span.components-label.badge.badge-secondary.cursor-pointer")
        .at(0)
        .text()
    ).toBe("2 days ago");
  });
});

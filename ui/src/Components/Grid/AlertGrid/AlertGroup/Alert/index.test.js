import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import toDiffableHtml from "diffable-html";

import { MockAlert, MockAnnotation, MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { BorderClassMap } from "Common/Colors";
import { Alert } from ".";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  advanceTo(new Date(2018, 7, 15, 20, 40, 0));
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
});

afterEach(() => {
  // reset Date() to current time
  clear();
  jest.restoreAllMocks();
});

const MockAfterUpdate = jest.fn();

const MockedAlert = () => {
  return MockAlert(
    [
      MockAnnotation("help", "some long text", true, false),
      MockAnnotation("hidden", "some hidden text", false, false),
      MockAnnotation("link", "http://localhost", true, true)
    ],
    { job: "node_exporter", cluster: "dev" },
    "active"
  );
};

const MountedAlert = (alert, group, showAlertmanagers, showReceiver) => {
  return mount(
    <Provider alertStore={alertStore}>
      <Alert
        alert={alert}
        group={group}
        showAlertmanagers={showAlertmanagers}
        showReceiver={showReceiver}
        afterUpdate={MockAfterUpdate}
        silenceFormStore={silenceFormStore}
      />
    </Provider>
  );
};

describe("<Alert />", () => {
  it("matches snapshot with showAlertmanagers=false showReceiver=false", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup({}, [alert], [], {});
    const tree = MountedAlert(alert, group, false, false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders @alertmanager label with showAlertmanagers=true", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup({}, [alert], [], {});
    const tree = MountedAlert(alert, group, true, false);
    const label = tree
      .find("FilteringLabel")
      .filterWhere(elem => elem.props().name === "@alertmanager");
    expect(label.text()).toBe("@alertmanager: default");
  });

  it("renders @receiver label with showReceiver=true", () => {
    const alert = MockedAlert();
    const group = MockAlertGroup({}, [alert], [], {});
    const tree = MountedAlert(alert, group, false, true);
    const label = tree
      .find("FilteringLabel")
      .filterWhere(elem => elem.props().name === "@receiver");
    expect(label.text()).toBe("@receiver: by-name");
  });

  it("renders a silence if alert is silenced", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    const group = MockAlertGroup({}, [alert], [], {});
    const tree = MountedAlert(alert, group, false, false);
    const silence = tree.find("Silence");
    expect(silence).toHaveLength(1);
    expect(silence.html()).toMatch(/silence123456789/);
  });

  it("uses BorderClassMap.active when @state=active", () => {
    const alert = MockedAlert();
    alert.state = "active";
    const group = MockAlertGroup({}, [alert], [], {});
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
    const group = MockAlertGroup({}, [alert], [], {});
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
    const group = MockAlertGroup({}, [alert], [], {});
    const tree = MountedAlert(alert, group, false, false);
    expect(
      tree
        .find(".components-grid-alertgrid-alertgroup-alert")
        .hasClass(BorderClassMap.unprocessed)
    ).toBe(true);
  });

  it("uses 'border-warning' with unknown @state", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const alert = MockedAlert();
    alert.state = "foobar";
    const group = MockAlertGroup({}, [alert], [], {});
    const tree = MountedAlert(alert, group, false, false);
    expect(
      tree
        .find(".components-grid-alertgrid-alertgroup-alert")
        .hasClass("border-warning")
    ).toBe(true);
  });
});

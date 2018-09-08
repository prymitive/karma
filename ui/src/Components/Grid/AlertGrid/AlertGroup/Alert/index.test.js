import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import toDiffableHtml from "diffable-html";

import { MockAlert, MockAnnotation } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
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

const MountedAlert = (alert, showAlertmanagers, showReceiver) => {
  return mount(
    <Provider alertStore={alertStore}>
      <Alert
        alert={alert}
        group={{}}
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
    const tree = MountedAlert(alert, false, false);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders @alertmanager label with showAlertmanagers=true", () => {
    const alert = MockedAlert();
    const tree = MountedAlert(alert, true, false);
    const label = tree
      .find("FilteringLabel")
      .filterWhere(elem => elem.props().name === "@alertmanager");
    expect(label.text()).toBe("@alertmanager: default");
  });

  it("renders @receiver label with showReceiver=true", () => {
    const alert = MockedAlert();
    const tree = MountedAlert(alert, false, true);
    const label = tree
      .find("FilteringLabel")
      .filterWhere(elem => elem.props().name === "@receiver");
    expect(label.text()).toBe("@receiver: by-name");
  });

  it("renders a silence if alert is silenced", () => {
    const alert = MockedAlert();
    alert.alertmanager[0].silencedBy = ["silence123456789"];
    const tree = MountedAlert(alert, false, false);
    const silence = tree.find("Silence");
    expect(silence).toHaveLength(1);
    expect(silence.html()).toMatch(/silence123456789/);
  });
});

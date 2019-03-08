import React from "react";

import { Provider } from "mobx-react";

import { mount } from "enzyme";

import moment from "moment";

import { MockAlert, MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertGroup } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;
let group;

const MockGroup = groupName => {
  const group = MockAlertGroup(
    { alertname: "Fake Alert", groupName: groupName },
    [],
    [],
    {},
    {}
  );
  return group;
};

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
  group = MockGroup("fakeGroup");
});

const MockAlerts = alertCount => {
  for (let i = 1; i <= alertCount; i++) {
    let alert = MockAlert([], { instance: `instance${i}` }, "active");
    const startsAt = moment().toISOString();
    alert.startsAt = startsAt;
    alert.alertmanager[0].startsAt = startsAt;
    group.alerts.push(alert);
  }
};

const MountedAlertGroup = (afterUpdate, showAlertmanagers) => {
  return mount(
    <Provider alertStore={alertStore}>
      <AlertGroup
        afterUpdate={afterUpdate}
        group={group}
        showAlertmanagers={showAlertmanagers}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
      />
    </Provider>
  );
};

describe("<AlertGroup />", () => {
  it("renders Alertmanager labels in footer if showAlertmanagersInFooter=true", () => {
    MockAlerts(2);
    const tree = MountedAlertGroup(jest.fn(), true).find("AlertGroup");
    expect(tree.find("GroupFooter").html()).toMatch(/@alertmanager/);
  });

  it("doesn't render alertmanager labels in footer when they are unique", () => {
    MockAlerts(5);
    for (let i = 0; i < group.alerts.length; i++) {
      group.alerts[i].alertmanager[0].name = `fakeAlertmanager${i}`;
    }
    group.alertmanagerCount = {
      fakeAlertmanager0: 1,
      fakeAlertmanager1: 1,
      fakeAlertmanager2: 1,
      fakeAlertmanager3: 1,
      fakeAlertmanager4: 1
    };
    const tree = MountedAlertGroup(jest.fn(), true);

    const alerts = tree.find("ul.list-group");
    expect(alerts.html()).toMatch(/@alertmanager/);

    const footer = tree.find("GroupFooter");
    expect(footer.html()).not.toMatch(/@alertmanager/);
  });

  it("only renders titlebar when collapsed", () => {
    MockAlerts(10);
    const tree = MountedAlertGroup(jest.fn(), false);
    const alertGroup = tree.find("AlertGroup");
    alertGroup.instance().collapse.toggle();
    expect(alertGroup.instance().collapse.value).toBe(true);
    tree.update();
    expect(tree.find("Alert")).toHaveLength(0);
    expect(tree.find("ul.list-group")).toHaveLength(0);
  });
});

const ValidateLoadButtonPresent = (totalAlerts, isPresent) => {
  MockAlerts(totalAlerts);
  const tree = MountedAlertGroup(jest.fn(), false);
  const buttons = tree.find("button");
  expect(buttons).toHaveLength(isPresent ? 2 : 0);
};

const ValidateLoadButtonAction = (
  totalAlerts,
  buttonIndex,
  iconMatch,
  loadedAlerts,
  alertsToRenderBeforeClick
) => {
  MockAlerts(totalAlerts);
  const tree = MountedAlertGroup(jest.fn(), false);
  if (alertsToRenderBeforeClick !== undefined) {
    tree
      .find("AlertGroup")
      .instance().renderConfig.alertsToRender = alertsToRenderBeforeClick;
    tree.update();
  }
  const loadMore = tree.find("button").at(buttonIndex);
  expect(loadMore.html()).toMatch(iconMatch);
  loadMore.simulate("click");
  tree.update();
  expect(tree.find("Alert")).toHaveLength(loadedAlerts);
};

describe("<AlertGroup /> renderConfig", () => {
  it("settingsStore.alertGroupConfig.config.defaultRenderCount should be 5 by default", () => {
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(5);
  });

  it("renderConfig.alertsToRender should be 5 by default", () => {
    const tree = MountedAlertGroup(jest.fn(), false).find("AlertGroup");
    expect(tree.instance().renderConfig.alertsToRender).toBe(5);
  });

  it("renders only up to renderConfig.alertsToRender alerts", () => {
    MockAlerts(50);
    const tree = MountedAlertGroup(jest.fn(), false).find("AlertGroup");
    const alerts = tree.find("Alert");
    expect(alerts).toHaveLength(tree.instance().renderConfig.alertsToRender);
  });

  it("load buttons are not rendered for 1 alert", () => {
    ValidateLoadButtonPresent(1, false);
  });

  it("load buttons are not rendered for 5 alerts", () => {
    ValidateLoadButtonPresent(5, false);
  });

  it("load buttons are rendered for 6 alert", () => {
    ValidateLoadButtonPresent(6, true);
  });

  it("clicking - icon hides 1 alert if there's 6 in total", () => {
    ValidateLoadButtonAction(6, 0, /fa-minus/, 5, 6);
  });

  it("clicking - icon hides 1 alert if there's 6 in total and we're showing 3", () => {
    ValidateLoadButtonAction(6, 0, /fa-minus/, 2, 3);
  });

  it("clicking - icon hides 2 alerts if there's 7 in total and we're showing 7", () => {
    ValidateLoadButtonAction(7, 0, /fa-minus/, 5, 7);
  });

  it("clicking - icon hides 5 alerts if there's 10 in total and we're showing 10", () => {
    ValidateLoadButtonAction(10, 0, /fa-minus/, 5, 10);
  });

  it("clicking - icon hides 5 alerts if there's 18 in total and we're showing 17", () => {
    ValidateLoadButtonAction(18, 0, /fa-minus/, 12, 17);
  });

  it("clicking + icon loads 1 more alert if there's 6 in total", () => {
    ValidateLoadButtonAction(6, 1, /fa-plus/, 6);
  });

  it("clicking + icon loads 4 more alert if there's 9 in total", () => {
    ValidateLoadButtonAction(9, 1, /fa-plus/, 9);
  });

  it("clicking + icon loads 5 more alert if there's 14 in total", () => {
    ValidateLoadButtonAction(14, 1, /fa-plus/, 10);
  });

  it("clicking + icon loads 5 more alert if there's 25 in total and we're showing 16", () => {
    ValidateLoadButtonAction(25, 1, /fa-plus/, 22, 17);
  });
});

import React from "react";

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

const MockGroup = (groupName) => {
  const group = MockAlertGroup(
    { alertname: "Fake Alert", groupName: groupName },
    [],
    [],
    {},
    {}
  );
  return group;
};

let originalInnerWidth;

beforeAll(() => {
  originalInnerWidth = global.innerWidth;
});

beforeEach(() => {
  global.innerWidth = originalInnerWidth;
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
  group = MockGroup("fakeGroup");
});

afterEach(() => {
  global.innerWidth = originalInnerWidth;
});

const MockAlerts = (alertCount) => {
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
    <AlertGroup
      afterUpdate={afterUpdate}
      group={group}
      showAlertmanagers={showAlertmanagers}
      settingsStore={settingsStore}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      gridLabelValue=""
    />
  );
};

const ValidateCollapse = (
  innerWidth,
  defaultCollapseState,
  shouldBeCollapsed
) => {
  global.innerWidth = innerWidth;

  settingsStore.alertGroupConfig.config.defaultCollapseState = defaultCollapseState;

  MockAlerts(3);
  const tree = MountedAlertGroup(jest.fn(), false);
  const alertGroup = tree.find("AlertGroup");
  expect(alertGroup.instance().collapse.value).toBe(shouldBeCollapsed);
  expect(tree.find("Alert")).toHaveLength(shouldBeCollapsed ? 0 : 3);
};

describe("<AlertGroup />", () => {
  it("doesn't crash on unmount", () => {
    MockAlerts(5);
    const tree = MountedAlertGroup(jest.fn(), true);
    tree.unmount();
  });

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
      fakeAlertmanager4: 1,
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

  it("is collapsed by default on desktop when defaultCollapseState=collapsed", () => {
    // set window.innerWidth to 2k to mock a desktop window
    ValidateCollapse(
      2048,
      settingsStore.alertGroupConfig.options.collapsed.value,
      true
    );
  });

  it("is collapsed by default on mobile when defaultCollapseState=collapsed", () => {
    // set window.innerWidth to <768 to mock a mobile window
    ValidateCollapse(
      767,
      settingsStore.alertGroupConfig.options.collapsed.value,
      true
    );
  });

  it("is expanded by default on desktop when defaultCollapseState=collapsedOnMobile", () => {
    // set window.innerWidth to 2k to mock a desktop window
    ValidateCollapse(
      2048,
      settingsStore.alertGroupConfig.options.collapsedOnMobile.value,
      false
    );
  });

  it("is collapsed by default on mobile when defaultCollapseState=collapsedOnMobile", () => {
    // set window.innerWidth to <768 to mock a mobile window
    ValidateCollapse(
      767,
      settingsStore.alertGroupConfig.options.collapsedOnMobile.value,
      true
    );
  });

  it("is expanded by default on desktop when defaultCollapseState=expanded", () => {
    // set window.innerWidth to 2k to mock a desktop window
    ValidateCollapse(
      2048,
      settingsStore.alertGroupConfig.options.expanded.value,
      false
    );
  });

  it("is expanded by default on mobile when defaultCollapseState=expanded", () => {
    // set window.innerWidth to <768 to mock a mobile window
    ValidateCollapse(
      767,
      settingsStore.alertGroupConfig.options.expanded.value,
      false
    );
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

  it("uses 'z-index: 100' style after setIsMenuOpen() is called on any Alert", () => {
    MockAlerts(5);
    const tree = MountedAlertGroup(jest.fn(), false);
    const instance = tree.find("AlertGroup").instance();

    expect(instance.renderConfig.isMenuOpen).toBe(false);

    tree.find("Alert").at(0).props().setIsMenuOpen(true);
    expect(instance.renderConfig.isMenuOpen).toBe(true);
    tree.update();
    expect(
      tree.find(".components-grid-alertgrid-alertgroup").at(0).props().style
        .zIndex
    ).toEqual(100);
  });

  it("uses 'z-index: 100' style after setIsMenuOpen() is called on AlertGroup header menu", () => {
    MockAlerts(5);
    const tree = MountedAlertGroup(jest.fn(), false);
    const instance = tree.find("AlertGroup").instance();

    expect(instance.renderConfig.isMenuOpen).toBe(false);

    tree.find("GroupHeader").at(0).props().setIsMenuOpen(true);
    expect(instance.renderConfig.isMenuOpen).toBe(true);
    tree.update();
    expect(
      tree.find(".components-grid-alertgrid-alertgroup").at(0).props().style
        .zIndex
    ).toEqual(100);
  });
});

describe("<AlertGroup /> card theme", () => {
  it("renders bg-light background when colorTitleBar=false", () => {
    settingsStore.alertGroupConfig.config.colorTitleBar = false;
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find(".card").hasClass("bg-light")).toBe(true);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(false);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders themed titlebar when colorTitleBar=false", () => {
    settingsStore.alertGroupConfig.config.colorTitleBar = false;
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("GroupHeader").props().themedCounters).toBe(true);
  });

  it("renders bg-light border when colorTitleBar=true and there are multiple alert states", () => {
    settingsStore.alertGroupConfig.config.colorTitleBar = false;
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find(".card").hasClass("bg-light")).toBe(true);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(false);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders themed titlebar when colorTitleBar=true and there are multiple alert states", () => {
    settingsStore.alertGroupConfig.config.colorTitleBar = true;
    group.stateCount = { active: 5, suppressed: 6, unprocessed: 7 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("GroupHeader").props().themedCounters).toBe(true);
  });

  it("renders state based background when colorTitleBar=true and there's only one alert state", () => {
    settingsStore.alertGroupConfig.config.colorTitleBar = true;
    group.stateCount = { active: 0, suppressed: 5, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find(".card").hasClass("bg-light")).toBe(false);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(true);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders unthemed titlebar when colorTitleBar=true and there's only one alert state", () => {
    settingsStore.alertGroupConfig.config.colorTitleBar = true;
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("GroupHeader").props().themedCounters).toBe(false);
  });
});

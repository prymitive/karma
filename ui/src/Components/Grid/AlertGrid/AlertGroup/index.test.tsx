import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { MockAlert, MockAlertGroup } from "__fixtures__/Alerts";
import {
  MockThemeContext,
  MockThemeContextWithoutAnimations,
} from "__fixtures__/Theme";
import { APIAlertGroupT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { Settings, CollapseStateT } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext, ThemeCtx } from "Components/Theme";
import AlertGroup from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;
let group: APIAlertGroupT;
let originalInnerWidth: number;

const MockGroup = (groupName: string) => {
  const group = MockAlertGroup(
    { alertname: "Fake Alert", groupName: groupName },
    [],
    [],
    {},
    {}
  );
  return group;
};

beforeAll(() => {
  originalInnerWidth = global.innerWidth;
});

beforeEach(() => {
  global.innerWidth = originalInnerWidth;
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();
  group = MockGroup("fakeGroup");

  alertStore.data.setReceivers(["by-cluster-service", "by-name"]);
});

afterEach(() => {
  global.innerWidth = originalInnerWidth;
});

const MockAlerts = (alertCount: number) => {
  for (let i = 1; i <= alertCount; i++) {
    const alert = MockAlert([], { instance: `instance${i}` }, "active");
    const startsAt = new Date();
    alert.startsAt = startsAt.toISOString();
    alert.alertmanager[0].startsAt = startsAt.toISOString();
    group.alerts.push(alert);
  }
};

const MountedAlertGroup = (
  afterUpdate: () => void,
  showAlertmanagers: boolean,
  initialAlertsToRender?: number,
  theme?: ThemeCtx
) => {
  return mount(
    <AlertGroup
      afterUpdate={afterUpdate}
      group={group}
      showAlertmanagers={showAlertmanagers}
      initialAlertsToRender={initialAlertsToRender}
      settingsStore={settingsStore}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      gridLabelValue=""
      groupWidth={420}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: theme || MockThemeContext },
    }
  );
};

const ValidateCollapse = (
  innerWidth: number,
  defaultCollapseState: CollapseStateT,
  shouldBeCollapsed: boolean
) => {
  global.innerWidth = innerWidth;

  settingsStore.alertGroupConfig.setDefaultCollapseState(defaultCollapseState);

  MockAlerts(3);
  const tree = MountedAlertGroup(jest.fn(), false);
  expect(tree.find("Alert")).toHaveLength(shouldBeCollapsed ? 0 : 3);
};

describe("<AlertGroup />", () => {
  it("doesn't crash on unmount", () => {
    MockAlerts(5);
    const tree = MountedAlertGroup(jest.fn(), true);
    tree.unmount();
  });

  it("uses 'animate' class when settingsStore.themeConfig.config.animations is true", () => {
    MockAlerts(5);
    const tree = MountedAlertGroup(jest.fn(), true, 5, MockThemeContext);
    expect(
      tree.find("div.components-grid-alertgrid-alertgroup").hasClass("animate")
    ).toBe(true);
  });

  it("doesn't use 'animate' class when settingsStore.themeConfig.config.animations is false", () => {
    MockAlerts(5);
    const tree = MountedAlertGroup(
      jest.fn(),
      true,
      5,
      MockThemeContextWithoutAnimations
    );
    expect(
      tree.find("div.components-grid-alertgrid-alertgroup").hasClass("animate")
    ).toBe(false);
  });

  it("renders Alertmanager cluster labels in footer if showAlertmanagersInFooter=true", () => {
    MockAlerts(2);
    const tree = MountedAlertGroup(jest.fn(), true).find("AlertGroup");
    expect(tree.find("GroupFooter").html()).toMatch(/@cluster/);
  });

  it("only renders one @cluster label per cluster in the footer", () => {
    MockAlerts(2);
    for (let i = 0; i < group.alerts.length; i++) {
      group.alerts[i].alertmanager.push({
        fingerprint: "123",
        name: "ha1",
        cluster: "HA",
        state: "active",
        startsAt: "2018-08-14T17:36:40.017867056Z",
        source: "http://localhost/graph",
        silencedBy: [],
        inhibitedBy: [],
      });
      group.alerts[i].alertmanager.push({
        fingerprint: "123",
        name: "ha2",
        cluster: "HA",
        state: "active",
        startsAt: "2018-08-14T17:36:40.017867056Z",
        source: "http://localhost/graph",
        silencedBy: [],
        inhibitedBy: [],
      });
    }
    const tree = MountedAlertGroup(jest.fn(), true).find("AlertGroup");
    const labels = tree.find("GroupFooter").find("FilteringLabel");
    expect(labels).toHaveLength(3);
    expect(labels.at(0).text()).toBe("@cluster: default");
    expect(labels.at(1).text()).toBe("@cluster: HA");
    expect(labels.at(2).text()).toBe("@receiver: by-name");
  });

  it("doesn't render @cluster labels with empty alertmanager array", () => {
    MockAlerts(2);
    for (let i = 0; i < group.alerts.length; i++) {
      group.alerts[i].alertmanager = [];
    }
    const tree = MountedAlertGroup(jest.fn(), true).find("AlertGroup");
    const labels = tree.find("GroupFooter").find("FilteringLabel");
    expect(labels).toHaveLength(1);
    expect(labels.at(0).text()).toBe("@receiver: by-name");
  });

  it("doesn't render @cluster labels in footer when they are unique", () => {
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
    expect(alerts.html()).toMatch(/@cluster/);

    const footer = tree.find("GroupFooter");
    expect(footer.html()).not.toMatch(/@cluster/);
  });

  it("only renders titlebar when collapsed", () => {
    MockAlerts(10);
    const tree = MountedAlertGroup(jest.fn(), false);
    tree.find("span.badge.cursor-pointer").at(1).simulate("click");
    expect(tree.find("Alert")).toHaveLength(0);
    expect(tree.find("ul.list-group")).toHaveLength(0);
  });

  it("renders reduced details when idle", () => {
    MockAlerts(10);
    alertStore.ui.setIsIdle(true);
    const tree = MountedAlertGroup(jest.fn(), true, 10, MockThemeContext);
    expect(tree.find("Alert")).toHaveLength(1);
  });

  it("is collapsed by default on desktop when defaultCollapseState=collapsed", () => {
    // set window.innerWidth to 2k to mock a desktop window
    ValidateCollapse(2048, "collapsed", true);
  });

  it("is collapsed by default on mobile when defaultCollapseState=collapsed", () => {
    // set window.innerWidth to <768 to mock a mobile window
    ValidateCollapse(767, "collapsed", true);
  });

  it("is expanded by default on desktop when defaultCollapseState=collapsedOnMobile", () => {
    // set window.innerWidth to 2k to mock a desktop window
    ValidateCollapse(2048, "collapsedOnMobile", false);
  });

  it("is collapsed by default on mobile when defaultCollapseState=collapsedOnMobile", () => {
    // set window.innerWidth to <768 to mock a mobile window
    ValidateCollapse(767, "collapsedOnMobile", true);
  });

  it("is expanded by default on desktop when defaultCollapseState=expanded", () => {
    // set window.innerWidth to 2k to mock a desktop window
    ValidateCollapse(2048, "expanded", false);
  });

  it("is expanded by default on mobile when defaultCollapseState=expanded", () => {
    // set window.innerWidth to <768 to mock a mobile window
    ValidateCollapse(767, "expanded", false);
  });

  it("renders @receiver label when alertStore.data.receivers.length > 1", () => {
    alertStore.data.setReceivers(["foo", "bar"]);
    MockAlerts(10);
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.html()).toMatch(/@receiver:/);
  });

  it("doesn't render @receiver label when alertStore.data.receivers.length == 0", () => {
    alertStore.data.setReceivers([]);
    MockAlerts(10);
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.html()).not.toMatch(/@receiver:/);
  });
});

const ValidateLoadButtonPresent = (totalAlerts: number, isPresent: boolean) => {
  MockAlerts(totalAlerts);
  const tree = MountedAlertGroup(jest.fn(), false);
  const buttons = tree.find("button");
  expect(buttons).toHaveLength(isPresent ? 2 : 0);
};

const ValidateLoadButtonAction = (
  totalAlerts: number,
  buttonIndex: number,
  iconMatch: RegExp,
  loadedAlerts: number,
  alertsToRenderBeforeClick?: number
) => {
  MockAlerts(totalAlerts);
  const tree = MountedAlertGroup(jest.fn(), false, alertsToRenderBeforeClick);
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

  it("renders only up to settingsStore.alertGroupConfig.config.defaultRenderCount alerts", () => {
    MockAlerts(50);
    const tree = MountedAlertGroup(jest.fn(), false).find("AlertGroup");
    const alerts = tree.find("Alert");
    expect(alerts).toHaveLength(
      settingsStore.alertGroupConfig.config.defaultRenderCount
    );
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

  it("uses 'z-index: 100' style after setIsMenuOpen() is called on any Alert", async () => {
    const promise = Promise.resolve();
    MockAlerts(5);
    const tree = MountedAlertGroup(jest.fn(), false);

    tree
      .find("Alert")
      .at(0)
      .find("span.bg-secondary.cursor-pointer")
      .at(0)
      .simulate("click");
    await act(() => promise);
    tree.update();
    expect(
      tree.find(".components-grid-alertgrid-alertgroup").at(0).prop("style")
    ).toMatchObject({ zIndex: 100 });
  });

  it("uses 'z-index: 100' style after setIsMenuOpen() is called on AlertGroup header menu", async () => {
    const promise = Promise.resolve();
    MockAlerts(5);
    const tree = MountedAlertGroup(jest.fn(), false);

    tree.find("span.cursor-pointer").at(0).simulate("click");
    await act(() => promise);
    tree.update();
    expect(
      tree.find(".components-grid-alertgrid-alertgroup").at(0).prop("style")
    ).toMatchObject({ zIndex: 100 });
  });
});

describe("<AlertGroup /> card theme", () => {
  it("renders bg-light background when colorTitleBar=false", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(false);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find(".card").hasClass("bg-light")).toBe(true);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(false);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders themed titlebar when colorTitleBar=false", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(false);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("GroupHeader").prop("themedCounters")).toBe(true);
  });

  it("renders bg-light border when colorTitleBar=true and there are multiple alert states", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(false);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find(".card").hasClass("bg-light")).toBe(true);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(false);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders themed titlebar when colorTitleBar=true and there are multiple alert states", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(true);
    group.stateCount = { active: 5, suppressed: 6, unprocessed: 7 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("GroupHeader").prop("themedCounters")).toBe(true);
  });

  it("renders state based background when colorTitleBar=true and there's only one alert state", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(true);
    group.stateCount = { active: 0, suppressed: 5, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find(".card").hasClass("bg-light")).toBe(false);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(true);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders unthemed titlebar when colorTitleBar=true and there's only one alert state", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(true);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("GroupHeader").prop("themedCounters")).toBe(false);
  });

  it("renders AlertHistory when enabled", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{ historyEnabled: true },
    });
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("AlertHistory")).toHaveLength(1);
  });

  it("doesn't render AlertHistory when disabled", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{ historyEnabled: false },
    });
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn(), false);
    expect(tree.find("AlertHistory")).toHaveLength(0);
  });
});

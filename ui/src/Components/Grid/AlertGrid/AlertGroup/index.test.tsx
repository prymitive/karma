import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { MockAlert, MockAlertGroup } from "__fixtures__/Alerts";
import {
  MockThemeContext,
  MockThemeContextWithoutAnimations,
} from "__fixtures__/Theme";
import { RainbowHistoryResponse } from "__fixtures__/AlertHistory";
import type { APIAlertGroupT, APIGridT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { Settings, CollapseStateT } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext, ThemeCtx } from "Components/Theme";
import AlertGroup from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;
let group: APIAlertGroupT;
let grid: APIGridT;
let originalInnerWidth: number;

const MockGroup = (groupName: string) => {
  const group = MockAlertGroup(
    [
      { name: "alertname", value: "Fake Alert" },
      { name: "groupName", value: "groupName" },
    ],
    [],
    [],
    [],
    {},
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
  alertStore.settings.setValues({
    ...alertStore.settings.values,
    ...{ historyEnabled: false },
  });

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
  global.innerWidth = originalInnerWidth;
});

const MockAlerts = (alertCount: number, totalAlerts: number) => {
  for (let i = 1; i <= alertCount; i++) {
    const alert = MockAlert(
      [],
      [{ name: "instance", value: `instance${i}` }],
      "active",
    );
    const startsAt = new Date();
    alert.startsAt = startsAt.toISOString();
    alert.alertmanager[0].startsAt = startsAt.toISOString();
    group.alerts.push(alert);
  }
  group.totalAlerts = totalAlerts;
};

const MountedAlertGroup = (afterUpdate: () => void, theme?: ThemeCtx) => {
  return mount(
    <AlertGroup
      afterUpdate={afterUpdate}
      grid={grid}
      group={group}
      settingsStore={settingsStore}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      gridLabelValue=""
      groupWidth={420}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: theme || MockThemeContext },
    },
  );
};

const ValidateCollapse = (
  innerWidth: number,
  defaultCollapseState: CollapseStateT,
  shouldBeCollapsed: boolean,
) => {
  global.innerWidth = innerWidth;

  settingsStore.alertGroupConfig.setDefaultCollapseState(defaultCollapseState);

  MockAlerts(3, 3);
  const tree = MountedAlertGroup(jest.fn());
  expect(tree.find("Memo(Alert)")).toHaveLength(shouldBeCollapsed ? 0 : 3);
};

describe("<AlertGroup />", () => {
  it("doesn't crash on unmount", () => {
    MockAlerts(5, 5);
    const tree = MountedAlertGroup(jest.fn());
    tree.unmount();
  });

  it("uses 'animate' class when settingsStore.themeConfig.config.animations is true", () => {
    MockAlerts(5, 5);
    const tree = MountedAlertGroup(jest.fn(), MockThemeContext);
    expect(
      tree.find("div.components-grid-alertgrid-alertgroup").hasClass("animate"),
    ).toBe(true);
  });

  it("doesn't use 'animate' class when settingsStore.themeConfig.config.animations is false", () => {
    MockAlerts(5, 5);
    const tree = MountedAlertGroup(
      jest.fn(),
      MockThemeContextWithoutAnimations,
    );
    expect(
      tree.find("div.components-grid-alertgrid-alertgroup").hasClass("animate"),
    ).toBe(false);
  });

  it("renders Alertmanager cluster labels in footer if shared", () => {
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
    MockAlerts(2, 2);
    group.shared.clusters = ["default", "second"];
    const tree = MountedAlertGroup(jest.fn()).find("Memo(AlertGroup)");
    expect(tree.find("Memo(GroupFooter)").html()).toMatch(/@cluster/);
  });

  it("only renders one @cluster label per cluster in the footer", () => {
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { default: ["default"], HA: ["ha1", "ha2"] },
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
          name: "ha1",
          cluster: "HA",
          clusterMembers: ["ha1", "ha2"],
          uri: "http://localhost",
          publicURI: "http://localhost",
          error: "",
          version: "0.24.0",
          readonly: false,
          corsCredentials: "include",
          headers: {},
        },
        {
          name: "ha2",
          cluster: "HA",
          clusterMembers: ["ha1", "ha2"],
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
    MockAlerts(2, 2);
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
    group.shared.clusters = ["default", "HA"];
    const tree = MountedAlertGroup(jest.fn()).find("Memo(AlertGroup)");
    const labels = tree.find("Memo(GroupFooter)").find("Memo(FilteringLabel)");
    expect(labels).toHaveLength(3);
    expect(labels.at(0).text()).toBe("@cluster: default");
    expect(labels.at(1).text()).toBe("@cluster: HA");
    expect(labels.at(2).text()).toBe("@receiver: by-name");
  });

  it("doesn't render @cluster labels with empty alertmanager array", () => {
    MockAlerts(2, 2);
    for (let i = 0; i < group.alerts.length; i++) {
      group.alerts[i].alertmanager = [];
    }
    const tree = MountedAlertGroup(jest.fn()).find("Memo(AlertGroup)");
    const labels = tree.find("Memo(GroupFooter)").find("Memo(FilteringLabel)");
    expect(labels).toHaveLength(1);
    expect(labels.at(0).text()).toBe("@receiver: by-name");
  });

  it("doesn't render @cluster labels in footer when they are unique", () => {
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
    MockAlerts(5, 5);
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
    const tree = MountedAlertGroup(jest.fn());

    const alerts = tree.find("ul.list-group");
    expect(alerts.html()).toMatch(/@cluster/);

    const footer = tree.find("Memo(GroupFooter)");
    expect(footer.html()).not.toMatch(/@cluster/);
  });

  it("only renders titlebar when collapsed", () => {
    MockAlerts(5, 10);
    const tree = MountedAlertGroup(jest.fn());
    tree.find("span.badge.cursor-pointer").at(1).simulate("click");
    expect(tree.find("Memo(Alert)")).toHaveLength(0);
    expect(tree.find("ul.list-group")).toHaveLength(0);
  });

  it("renders reduced details when idle", () => {
    MockAlerts(5, 10);
    alertStore.ui.setIsIdle(true);
    const tree = MountedAlertGroup(jest.fn(), MockThemeContext);
    expect(tree.find("Memo(Alert)")).toHaveLength(1);
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
    MockAlerts(5, 10);
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.html()).toMatch(/@receiver:/);
  });

  it("doesn't render @receiver label when alertStore.data.receivers.length == 0", () => {
    alertStore.data.setReceivers([]);
    MockAlerts(5, 10);
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.html()).not.toMatch(/@receiver:/);
  });
});

const ValidateLoadButtonPresent = (
  alertCount: number,
  totalAlerts: number,
  isPresent: boolean,
) => {
  MockAlerts(alertCount, totalAlerts);
  const tree = MountedAlertGroup(jest.fn());
  const buttons = tree.find("button");
  expect(buttons).toHaveLength(isPresent ? 2 : 0);
};

const ValidateLoadButtonAction = (
  alertCount: number,
  totalAlerts: number,
  buttonIndex: number,
  iconMatch: RegExp,
  loadedAlerts: number,
) => {
  MockAlerts(alertCount, totalAlerts);
  const tree = MountedAlertGroup(jest.fn());
  const loadMore = tree.find("button").at(buttonIndex);
  expect(loadMore.html()).toMatch(iconMatch);
  loadMore.simulate("click");
  expect(alertStore.ui.groupAlertLimits[group.id]).toBe(loadedAlerts);
};

describe("<AlertGroup /> renderConfig", () => {
  it("settingsStore.alertGroupConfig.config.defaultRenderCount should be 5 by default", () => {
    expect(settingsStore.alertGroupConfig.config.defaultRenderCount).toBe(5);
  });

  it("load buttons are not rendered for 1 alert", () => {
    ValidateLoadButtonPresent(1, 1, false);
  });

  it("load buttons are not rendered for 5 alerts", () => {
    ValidateLoadButtonPresent(5, 5, false);
  });

  it("load buttons are rendered for 6 alert", () => {
    ValidateLoadButtonPresent(5, 6, true);
  });

  it("clicking - icon hides 1 alert if there's 6 in total", () => {
    ValidateLoadButtonAction(6, 6, 0, /fa-minus/, 5);
  });

  it("clicking - icon hides 1 alert if there's 6 in total and we're showing 3", () => {
    ValidateLoadButtonAction(3, 6, 0, /fa-minus/, 2);
  });

  it("clicking - icon hides 2 alerts if there's 7 in total and we're showing 7", () => {
    ValidateLoadButtonAction(7, 7, 0, /fa-minus/, 5);
  });

  it("clicking - icon hides 5 alerts if there's 10 in total and we're showing 10", () => {
    ValidateLoadButtonAction(10, 10, 0, /fa-minus/, 5);
  });

  it("clicking - icon hides 5 alerts if there's 18 in total and we're showing 17", () => {
    ValidateLoadButtonAction(17, 18, 0, /fa-minus/, 12);
  });

  it("clicking + icon loads 1 more alert if there's 6 in total", () => {
    ValidateLoadButtonAction(5, 6, 1, /fa-plus/, 6);
  });

  it("clicking + icon loads 4 more alert if there's 9 in total", () => {
    ValidateLoadButtonAction(5, 9, 1, /fa-plus/, 9);
  });

  it("clicking + icon loads 5 more alert if there's 14 in total", () => {
    ValidateLoadButtonAction(5, 14, 1, /fa-plus/, 10);
  });

  it("clicking + icon loads 5 more alert if there's 25 in total and we're showing 16", () => {
    ValidateLoadButtonAction(16, 25, 1, /fa-plus/, 21);
  });

  it("uses 'z-index: 100' style after setIsMenuOpen() is called on any Alert", async () => {
    fetchMock.reset();
    fetchMock.mock("*", { body: "" });

    const promise = Promise.resolve();
    MockAlerts(5, 5);
    const tree = MountedAlertGroup(jest.fn());

    tree
      .find("Memo(Alert)")
      .at(0)
      .find("span.bg-secondary.cursor-pointer")
      .at(0)
      .simulate("click");
    await act(() => promise);
    tree.update();
    expect(
      tree.find(".components-grid-alertgrid-alertgroup").at(0).prop("style"),
    ).toMatchObject({ zIndex: 100 });
  });

  it("uses 'z-index: 100' style after setIsMenuOpen() is called on AlertGroup header menu", async () => {
    const promise = Promise.resolve();
    MockAlerts(5, 5);
    const tree = MountedAlertGroup(jest.fn());

    tree.find("span.cursor-pointer").at(0).simulate("click");
    await act(() => promise);
    tree.update();
    expect(
      tree.find(".components-grid-alertgrid-alertgroup").at(0).prop("style"),
    ).toMatchObject({ zIndex: 100 });
  });
});

describe("<AlertGroup /> card theme", () => {
  it("renders bg-light background when colorTitleBar=false", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(false);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.find(".card").hasClass("bg-light")).toBe(true);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(false);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders themed titlebar when colorTitleBar=false", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(false);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.find("Memo(GroupHeader)").prop("themedCounters")).toBe(true);
  });

  it("renders bg-light border when colorTitleBar=true and there are multiple alert states", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(false);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.find(".card").hasClass("bg-light")).toBe(true);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(false);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders themed titlebar when colorTitleBar=true and there are multiple alert states", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(true);
    group.stateCount = { active: 5, suppressed: 6, unprocessed: 7 };
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.find("Memo(GroupHeader)").prop("themedCounters")).toBe(true);
  });

  it("renders state based background when colorTitleBar=true and there's only one alert state", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(true);
    group.stateCount = { active: 0, suppressed: 5, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.find(".card").hasClass("bg-light")).toBe(false);
    expect(tree.find(".card").hasClass("bg-danger")).toBe(false);
    expect(tree.find(".card").hasClass("bg-success")).toBe(true);
    expect(tree.find(".card").hasClass("bg-secondary")).toBe(false);
  });

  it("renders unthemed titlebar when colorTitleBar=true and there's only one alert state", () => {
    settingsStore.alertGroupConfig.setColorTitleBar(true);
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.find("Memo(GroupHeader)").prop("themedCounters")).toBe(false);
  });

  it("renders AlertHistory when enabled", async () => {
    fetchMock.reset();
    fetchMock.mock(
      "/history.json",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(RainbowHistoryResponse),
      },
      {
        overwriteRoutes: true,
      },
    );

    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{ historyEnabled: true },
    });
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn());
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(tree.find("AlertHistory")).toHaveLength(1);
    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.calls()[0][0]).toBe("/history.json");
  });

  it("doesn't render AlertHistory when disabled", () => {
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      ...{ historyEnabled: false },
    });
    group.stateCount = { active: 5, suppressed: 0, unprocessed: 0 };
    const tree = MountedAlertGroup(jest.fn());
    expect(tree.find("AlertHistory")).toHaveLength(0);
  });
});

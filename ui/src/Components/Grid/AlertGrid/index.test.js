import React from "react";

import { shallow } from "enzyme";

import { MockAlert, MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertGrid } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const ShallowAlertGrid = () => {
  return shallow(
    <AlertGrid
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

const MockGroup = (groupName, alertCount) => {
  let alerts = [];
  for (let i = 1; i <= alertCount; i++) {
    alerts.push(MockAlert([], { instance: `instance${i}` }, "active"));
  }
  const group = MockAlertGroup(
    { alertname: "Fake Alert", group: groupName },
    alerts,
    [],
    {}
  );
  return group;
};

const MockGroupList = (count, alertPerGroup) => {
  let groups = {};
  for (let i = 1; i <= count; i++) {
    let id = `id${i}`;
    let hash = `hash${i}`;
    let group = MockGroup(`group${i}`, alertPerGroup);
    group.id = id;
    group.hash = hash;
    groups[id] = group;
  }
  alertStore.data.upstreams = {
    counters: { total: 0, healthy: 1, failed: 0 },
    instances: [{ name: "am", uri: "http://am", error: "" }],
    clusters: { am: ["am"] }
  };
  alertStore.data.groups = groups;
};

describe("<AlertGrid />", () => {
  it("renders only first 50 alert groups", () => {
    MockGroupList(60, 5);
    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups).toHaveLength(50);
  });

  it("appends 30 groups after loadMore() call", () => {
    MockGroupList(100, 5);
    const tree = ShallowAlertGrid();
    // call it directly, it should happen on scroll to the bottom of the page
    tree.instance().loadMore();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups).toHaveLength(80);
  });

  it("calls masonryRepack() after update`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    const repackSpy = jest.spyOn(instance, "masonryRepack");
    // it's a shallow render so we don't really have masonry mounted, fake it
    instance.masonryComponentReference.ref = {
      forcePack: jest.fn()
    };
    instance.componentDidUpdate();
    expect(repackSpy).toHaveBeenCalled();
    expect(instance.masonryComponentReference.ref.forcePack).toHaveBeenCalled();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=false`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    const repackSpy = jest.spyOn(instance, "masonryRepack");
    instance.masonryComponentReference.ref = false;
    instance.componentDidUpdate();
    expect(repackSpy).toHaveBeenCalled();
  });

  it("calling storeMasonryRef() saves the ref in local store", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    instance.storeMasonryRef("foo");
    expect(instance.masonryComponentReference.ref).toEqual("foo");
  });

  it("doesn't sort groups when sorting is set to 'disabled'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.disabled.value;
    settingsStore.gridConfig.config.reverseSort = false;
    MockGroupList(3, 1);
    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id1",
      "id2",
      "id3"
    ]);
  });

  it("doesn't sort groups when sorting is set to 'disabled' and 'reverse' is on", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.disabled.value;
    settingsStore.gridConfig.config.reverseSort = true;
    MockGroupList(3, 1);
    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id1",
      "id2",
      "id3"
    ]);
  });

  it("groups are sorted by timestamp when sorting is set to 'startsAt'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.startsAt.value;
    settingsStore.gridConfig.config.reverseSort = false;

    MockGroupList(3, 1);
    alertStore.data.groups.id1.alerts[0].startsAt = "2001-01-01T00:00:00Z";
    alertStore.data.groups.id2.alerts[0].startsAt = "2002-01-01T00:00:00Z";
    alertStore.data.groups.id3.alerts[0].startsAt = "2000-01-01T00:00:00Z";

    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id3",
      "id1",
      "id2"
    ]);
  });

  it("groups are sorted by reversed timestamp when sorting is set to 'startsAt' and 'reverse' is on", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.startsAt.value;
    settingsStore.gridConfig.config.reverseSort = true;

    MockGroupList(3, 1);
    alertStore.data.groups.id1.alerts[0].startsAt = "2001-01-01T00:00:00Z";
    alertStore.data.groups.id2.alerts[0].startsAt = "2002-01-01T00:00:00Z";
    alertStore.data.groups.id3.alerts[0].startsAt = "2000-01-01T00:00:00Z";

    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id2",
      "id1",
      "id3"
    ]);
  });

  it("groups are sorted by label when sorting is set to 'label'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "instance";
    settingsStore.gridConfig.config.reverseSort = false;

    MockGroupList(3, 1);
    alertStore.data.groups.id1.alerts[0].labels.instance = "abc1";
    alertStore.data.groups.id2.alerts[0].labels.instance = "abc3";
    alertStore.data.groups.id3.alerts[0].labels.instance = "abc2";

    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id1",
      "id3",
      "id2"
    ]);
  });

  it("groups are sorted by reverse label when sorting is set to 'label' and 'reverse' is on", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "instance";
    settingsStore.gridConfig.config.reverseSort = true;

    MockGroupList(3, 1);
    alertStore.data.groups.id1.alerts[0].labels.instance = "abc1";
    alertStore.data.groups.id2.alerts[0].labels.instance = "abc3";
    alertStore.data.groups.id3.alerts[0].labels.instance = "abc2";

    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id2",
      "id3",
      "id1"
    ]);
  });

  it("sorting is no-op when when sorting is set to 'label' and alerts lack that label", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "foo";
    settingsStore.gridConfig.config.reverseSort = false;
    MockGroupList(3, 1);
    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id1",
      "id2",
      "id3"
    ]);
  });
});

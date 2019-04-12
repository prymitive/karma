import React from "react";

import { shallow } from "enzyme";

import { advanceBy, clear } from "jest-date-mock";

import { MockAlert, MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertGrid } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;
let bodyWidth;

beforeAll(() => {
  jest.useFakeTimers();
  Object.defineProperty(document.body, "clientWidth", {
    get: () => {
      return bodyWidth;
    }
  });
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  clear();
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
    {},
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

const VerifyColumnCount = (innerWidth, columns) => {
  bodyWidth = innerWidth;
  MockGroupList(60, 5);
  const tree = ShallowAlertGrid();
  expect(
    tree
      .find("AlertGroup")
      .at(0)
      .props().style.width
  ).toBe(Math.floor(innerWidth / columns));
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

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=null`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    const repackSpy = jest.spyOn(instance, "masonryRepack");
    instance.masonryComponentReference.ref = null;
    instance.componentDidUpdate();
    expect(repackSpy).toHaveBeenCalled();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=undefined`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    const repackSpy = jest.spyOn(instance, "masonryRepack");
    instance.masonryComponentReference.ref = undefined;
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

  it("label value mappings from settings are used to order alerts", () => {
    alertStore.settings.values.sorting.valueMapping = {
      cluster: {
        prod: 1,
        staging: 2,
        dev: 3
      }
    };

    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "cluster";
    settingsStore.gridConfig.config.reverseSort = false;

    MockGroupList(3, 1);
    alertStore.data.groups.id1.alerts[0].labels.cluster = "dev";
    alertStore.data.groups.id2.alerts[0].labels.cluster = "staging";
    alertStore.data.groups.id3.alerts[0].labels.cluster = "prod";

    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id3",
      "id2",
      "id1"
    ]);
  });

  it("label value mappings from settings are used to order alerts and reverse flag is respected", () => {
    alertStore.settings.values.sorting.valueMapping = {
      cluster: {
        prod: 1,
        staging: 2,
        dev: 3
      }
    };

    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.label.value;
    settingsStore.gridConfig.config.sortLabel = "cluster";
    settingsStore.gridConfig.config.reverseSort = true;

    MockGroupList(3, 1);
    alertStore.data.groups.id1.alerts[0].labels.cluster = "dev";
    alertStore.data.groups.id2.alerts[0].labels.cluster = "prod";
    alertStore.data.groups.id3.alerts[0].labels.cluster = "staging";

    const tree = ShallowAlertGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map(g => g.props().group.id)).toEqual([
      "id1",
      "id3",
      "id2"
    ]);
  });

  it("doesn't throw errors after FontFaceObserver timeout", () => {
    MockGroupList(60, 5);
    ShallowAlertGrid();
    // skip a minute to trigger FontFaceObserver timeout handler
    advanceBy(60 * 1000);
    jest.runOnlyPendingTimers();
  });

  it("renders 1 column with document.body.clientWidth=799", () => {
    VerifyColumnCount(799, 1);
  });

  it("renders 2 columns with document.body.clientWidth=800", () => {
    VerifyColumnCount(800, 2);
  });

  it("renders 2 columns with document.body.clientWidth=1399", () => {
    VerifyColumnCount(1399, 2);
  });

  it("renders 3 columns with document.body.clientWidth=1400", () => {
    VerifyColumnCount(1400, 3);
  });

  it("renders 3 columns with document.body.clientWidth=2099", () => {
    VerifyColumnCount(2099, 3);
  });

  it("renders 4 columns with document.body.clientWidth=2100", () => {
    VerifyColumnCount(2100, 4);
  });

  it("renders 4 columns with document.body.clientWidth=2799", () => {
    VerifyColumnCount(2799, 4);
  });

  it("renders 5 columns with document.body.clientWidth=2800", () => {
    VerifyColumnCount(2800, 5);
  });

  it("renders 5 columns with document.body.clientWidth=3499", () => {
    VerifyColumnCount(3499, 5);
  });

  it("renders 6 columns with document.body.clientWidth=1399", () => {
    VerifyColumnCount(3500, 6);
  });

  it("renders 6 columns with document.body.clientWidth=4199", () => {
    VerifyColumnCount(4199, 6);
  });

  it("renders 7 columns with document.body.clientWidth=1399", () => {
    VerifyColumnCount(4200, 7);
  });

  it("renders 7 columns with document.body.clientWidth=5599", () => {
    VerifyColumnCount(5599, 7);
  });

  it("renders 8 columns with document.body.clientWidth=5600", () => {
    VerifyColumnCount(5600, 8);
  });

  it("viewport resize also resizes alert groups", () => {
    bodyWidth = 1980;
    MockGroupList(60, 5);
    const tree = ShallowAlertGrid();
    expect(
      tree
        .find("AlertGroup")
        .at(0)
        .props().style.width
    ).toBe(1980 / 3);

    bodyWidth = 1000;
    // not sure how to force ReactResizeDetector to detect width change, so
    // we directly call viewport update here
    tree.instance().viewport.update();
    expect(
      tree
        .find("AlertGroup")
        .at(0)
        .props().style.width
    ).toBe(1000 / 2);
  });

  it("doesn't crash on unmount", () => {
    MockGroupList(60, 5);
    const tree = ShallowAlertGrid();
    tree.unmount();
  });
});

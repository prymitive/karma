import React from "react";

import { shallow } from "enzyme";

import { advanceBy, clear } from "jest-date-mock";

import { MockAlert, MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { GetGridElementWidth } from "./GridSize";
import { AlertGrid } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeAll(() => {
  jest.useFakeTimers();
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
  let groups = [];
  for (let i = 1; i <= count; i++) {
    let id = `id${i}`;
    let hash = `hash${i}`;
    let group = MockGroup(`group${i}`, alertPerGroup);
    group.id = id;
    group.hash = hash;
    groups.push(group);
  }
  alertStore.data.upstreams = {
    counters: { total: 0, healthy: 1, failed: 0 },
    instances: [{ name: "am", uri: "http://am", error: "" }],
    clusters: { am: ["am"] }
  };
  alertStore.data.groups = groups;
};

const VerifyColumnCount = (innerWidth, columns) => {
  MockGroupList(60, 5);
  const tree = ShallowAlertGrid();
  tree.instance().viewport.update(innerWidth, 500);
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

  it("calling masonryRepack() calls forcePack() on Masonry instance`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    // it's a shallow render so we don't really have masonry mounted, fake it
    instance.masonryComponentReference.ref = {
      forcePack: jest.fn()
    };
    instance.masonryRepack();
    expect(instance.masonryComponentReference.ref.forcePack).toHaveBeenCalled();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=false`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    instance.masonryComponentReference.ref = false;
    instance.masonryRepack();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=null`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    instance.masonryComponentReference.ref = null;
    instance.masonryRepack();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=undefined`", () => {
    const tree = ShallowAlertGrid();
    const instance = tree.instance();
    instance.masonryComponentReference.ref = undefined;
    instance.masonryRepack();
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

  it("doesn't throw errors after FontFaceObserver timeout", () => {
    MockGroupList(60, 5);
    ShallowAlertGrid();
    // skip a minute to trigger FontFaceObserver timeout handler
    advanceBy(60 * 1000);
    jest.runOnlyPendingTimers();
  });

  // known breakpoints calculated from GridSize logic
  [
    { breakpoint: 400, columns: 1 },
    { breakpoint: 800, columns: 2 },
    { breakpoint: 1200, columns: 3 },
    { breakpoint: 1600, columns: 4 },
    { breakpoint: 2000, columns: 5 },
    { breakpoint: 2400, columns: 6 },
    { breakpoint: 3000, columns: 7 },
    { breakpoint: 3400, columns: 8 },
    { breakpoint: 3800, columns: 9 },
    { breakpoint: 4200, columns: 10 }
  ].map(t =>
    it(`renders ${t.columns} column(s) on ${t.breakpoint} breakpoint`, () => {
      settingsStore.gridConfig.config.groupWidth = 400;
      VerifyColumnCount(t.canvas - 1, Math.max(1, t.columns - 1));
      VerifyColumnCount(t.canvas, t.columns);
      VerifyColumnCount(t.canvas + 1, t.columns);
    })
  );

  // populare screen resolutions
  [
    { canvas: 640, columns: 1 },
    { canvas: 1024, columns: 2 },
    { canvas: 1280, columns: 3 },
    { canvas: 1366, columns: 3 },
    { canvas: 1440, columns: 3 },
    { canvas: 1600, columns: 4 },
    { canvas: 1680, columns: 4 },
    { canvas: 1920, columns: 4 },
    { canvas: 2048, columns: 5 },
    { canvas: 2560, columns: 6 },
    { canvas: 3840, columns: 9 }
  ].map(t =>
    it(`renders ${t.columns} column(s) with ${t.canvas} resolution`, () => {
      settingsStore.gridConfig.config.groupWidth = 400;
      VerifyColumnCount(t.canvas, t.columns);
    })
  );

  it("renders expected number of columns for every resolution", () => {
    const minWidth = 400;
    let lastColumns = 1;
    for (let i = 100; i <= 4096; i++) {
      const expectedColumns = Math.max(Math.floor(i / minWidth), 1);
      const columns = Math.floor(i / GetGridElementWidth(i, minWidth));

      expect({
        resolution: i,
        minWidth: minWidth,
        columns: columns
      }).toEqual({
        resolution: i,
        minWidth: minWidth,
        columns: expectedColumns
      });
      expect(columns).toBeGreaterThanOrEqual(lastColumns);

      // keep track of column count to verify that each incrementing resolution
      // doesn't result in lower number of columns rendered
      lastColumns = columns;
    }
  });

  it("viewport resize also resizes alert groups", () => {
    MockGroupList(60, 5);
    const tree = ShallowAlertGrid();
    // set initial width
    tree.instance().viewport.update(1980, 500);
    expect(
      tree
        .find("AlertGroup")
        .at(0)
        .props().style.width
    ).toBe(1980 / 4);

    // then resize and verify if column count was changed
    tree.instance().viewport.update(1000, 500);
    expect(
      tree
        .find("AlertGroup")
        .at(0)
        .props().style.width
    ).toBe(1000 / 2);
  });

  it("viewport resize doesn't allow loops", () => {
    settingsStore.gridConfig.config.groupWidth = 410;
    const tree = ShallowAlertGrid();

    let results = [];
    for (var index = 0; index < 14; index++) {
      MockGroupList(60, 5);
      tree.instance().viewport.update(index % 2 === 0 ? 800 : 830, 500);
      results.push(
        tree
          .find("AlertGroup")
          .at(0)
          .props().style.width
      );
    }

    // first 4 results will switch beween 1 and 2 columns, but after than it
    // should stabilise and return same result as the grid width
    expect(results).toStrictEqual([
      800,
      415,
      800,
      415,
      800,
      830,
      800,
      830,
      800,
      830,
      800,
      830,
      800,
      830
    ]);

    // so now let's call it without any loop
    results = [];
    for (let width of [840, 820, 450, 450, 1200]) {
      tree.instance().viewport.update(width, 500);
      results.push(
        tree
          .find("AlertGroup")
          .at(0)
          .props().style.width
      );
    }
    expect(results).toStrictEqual([420, 410, 450, 450, 600]);
  });

  it("doesn't crash on unmount", () => {
    MockGroupList(60, 5);
    const tree = ShallowAlertGrid();
    tree.unmount();
  });
});

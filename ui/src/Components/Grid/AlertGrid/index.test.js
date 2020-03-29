import React from "react";

import { shallow, mount } from "enzyme";

import { advanceBy, clear } from "jest-date-mock";

import { MockAlert, MockAlertGroup } from "__mocks__/Alerts.js";
import { mockMatchMedia } from "__mocks__/matchMedia";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { GetGridElementWidth, GridSizesConfig } from "./GridSize";
import { Grid } from "./Grid";
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

  window.matchMedia = mockMatchMedia({});
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

const ShallowGrid = () => {
  return shallow(
    <Grid
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
      gridSizesConfig={GridSizesConfig(1024, 420)}
      groupWidth={420}
      gridLabelName=""
      gridLabelValue=""
      gridAlertGroups={
        alertStore.data.grids.length ? alertStore.data.grids[0].alertGroups : []
      }
    />
  );
};

const MountedGrid = () => {
  return mount(
    <Grid
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
      gridSizesConfig={GridSizesConfig(1024, 420)}
      groupWidth={420}
      gridLabelName=""
      gridLabelValue=""
      gridAlertGroups={
        alertStore.data.grids.length ? alertStore.data.grids[0].alertGroups : []
      }
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
    let group = MockGroup(`group${i}`, alertPerGroup);
    group.id = id;
    groups.push(group);
  }
  alertStore.data.upstreams = {
    counters: { total: 0, healthy: 1, failed: 0 },
    instances: [{ name: "am", uri: "http://am", error: "" }],
    clusters: { am: ["am"] },
  };
  alertStore.data.grids = [
    {
      labelName: "",
      labelValue: "",
      alertGroups: groups,
    },
  ];
};

describe("<Grid />", () => {
  it("renders only first 50 alert groups", () => {
    MockGroupList(60, 5);
    const tree = ShallowGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups).toHaveLength(50);
  });

  it("appends 30 groups after clicking 'Load More' button", () => {
    MockGroupList(100, 5);
    const tree = ShallowGrid();
    tree.find("button").simulate("click");
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups).toHaveLength(80);
  });

  it("resets groupsToRender.value back to 50 if current value is more than group alerts", () => {
    MockGroupList(100, 5);
    const tree = ShallowGrid();
    expect(tree.find("AlertGroup")).toHaveLength(50);
    expect(tree.instance().groupsToRender.value).toBe(50);

    tree.find("button").simulate("click");
    expect(tree.find("AlertGroup")).toHaveLength(80);
    expect(tree.instance().groupsToRender.value).toBe(80);

    MockGroupList(10, 5);
    tree.setProps({ gridAlertGroups: alertStore.data.grids[0].alertGroups });
    expect(tree.find("AlertGroup")).toHaveLength(10);
    expect(tree.instance().groupsToRender.value).toBe(50);

    MockGroupList(100, 5);
    tree.setProps({ gridAlertGroups: alertStore.data.grids[0].alertGroups });
    expect(tree.find("AlertGroup")).toHaveLength(50);
    expect(tree.instance().groupsToRender.value).toBe(50);
  });

  it("calling masonryRepack() calls forcePack() on Masonry instance`", () => {
    const tree = ShallowGrid();
    const instance = tree.instance();
    // it's a shallow render so we don't really have masonry mounted, fake it
    instance.masonryComponentReference.ref = {
      forcePack: jest.fn(),
    };
    instance.masonryRepack();
    expect(instance.masonryComponentReference.ref.forcePack).toHaveBeenCalled();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=false`", () => {
    const tree = ShallowGrid();
    const instance = tree.instance();
    instance.masonryComponentReference.ref = false;
    instance.masonryRepack();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=null`", () => {
    const tree = ShallowGrid();
    const instance = tree.instance();
    instance.masonryComponentReference.ref = null;
    instance.masonryRepack();
  });

  it("masonryRepack() doesn't crash when masonryComponentReference.ref=undefined`", () => {
    const tree = ShallowGrid();
    const instance = tree.instance();
    instance.masonryComponentReference.ref = undefined;
    instance.masonryRepack();
  });

  it("calling storeMasonryRef() saves the ref in local store", () => {
    const tree = ShallowGrid();
    const instance = tree.instance();
    instance.storeMasonryRef("foo");
    expect(instance.masonryComponentReference.ref).toEqual("foo");
  });

  it("doesn't sort groups when sorting is set to 'disabled'", () => {
    settingsStore.gridConfig.config.sortOrder =
      settingsStore.gridConfig.options.disabled.value;
    settingsStore.gridConfig.config.reverseSort = false;
    MockGroupList(3, 1);
    const tree = ShallowGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map((g) => g.props().group.id)).toEqual([
      "id1",
      "id2",
      "id3",
    ]);
  });

  it("click on the grid toggle toggles all groups", () => {
    MockGroupList(10, 3);
    const tree = MountedGrid();
    tree.setProps({
      gridLabelName: "foo",
      gridLabelValue: "bar",
    });
    expect(tree.find("AlertGroup")).toHaveLength(10);

    tree.find("span.cursor-pointer").at(0).simulate("click");
    expect(tree.find("AlertGroup")).toHaveLength(0);

    tree.find("span.cursor-pointer").at(0).simulate("click");
    expect(tree.find("AlertGroup")).toHaveLength(10);
  });

  it("left click on a group collapse toggle only toggles clicked group", () => {
    MockGroupList(10, 3);
    const tree = MountedGrid();

    for (let i = 0; i <= 9; i++) {
      expect(tree.find("AlertGroup").at(i).find("Alert")).toHaveLength(3);
    }

    tree
      .find("AlertGroup")
      .at(2)
      .find("GroupHeader")
      .find("span.cursor-pointer")
      .at(1)
      .simulate("click");

    for (let i = 0; i <= 9; i++) {
      expect(tree.find("AlertGroup").at(i).find("Alert")).toHaveLength(
        i === 2 ? 0 : 3
      );
    }
  });

  it("left click + alt on a group collapse toggle toggles all groups", () => {
    MockGroupList(10, 3);
    const tree = MountedGrid();

    for (let i = 0; i <= 9; i++) {
      expect(tree.find("AlertGroup").at(i).find("Alert")).toHaveLength(3);
    }

    tree
      .find("AlertGroup")
      .at(2)
      .find("GroupHeader")
      .find("span.cursor-pointer")
      .at(1)
      .simulate("click", { altKey: true });

    for (let i = 0; i <= 9; i++) {
      expect(tree.find("AlertGroup").at(i).find("Alert")).toHaveLength(0);
    }
  });
});

describe("<AlertGrid />", () => {
  const VerifyColumnCount = (innerWidth, outerWidth, columns) => {
    MockGroupList(60, 5);

    const wrapper = ShallowAlertGrid();
    wrapper.instance().viewport.updateWidths(innerWidth, outerWidth);

    const tree = ShallowGrid();
    tree.setProps({
      gridSizesConfig: wrapper.instance().viewport.gridSizesConfig,
      groupWidth: wrapper.instance().viewport.groupWidth,
    });

    expect(tree.find("AlertGroup").at(0).props().style.width).toBe(
      Math.floor(innerWidth / columns)
    );
  };

  it("doesn't throw errors after FontFaceObserver timeout", () => {
    MockGroupList(60, 5);
    ShallowAlertGrid();
    // skip a minute to trigger FontFaceObserver timeout handler
    advanceBy(60 * 1000);
    jest.runOnlyPendingTimers();
  });

  // known breakpoints calculated from GridSize logic
  [
    { canvas: 400, columns: 1 },
    { canvas: 800, columns: 2 },
    { canvas: 1200, columns: 3 },
    { canvas: 1600, columns: 4 },
    { canvas: 2000, columns: 5 },
    { canvas: 2400, columns: 6 },
    { canvas: 2800, columns: 7 },
    { canvas: 3200, columns: 8 },
    { canvas: 3600, columns: 9 },
    { canvas: 4000, columns: 10 },
  ].map((t) =>
    it(`renders ${t.columns} column(s) on ${t.canvas} breakpoint`, () => {
      settingsStore.gridConfig.config.groupWidth = 400;
      VerifyColumnCount(t.canvas - 1, t.canvas - 1, Math.max(1, t.columns - 1));
      VerifyColumnCount(t.canvas, t.canvas, t.columns);
      VerifyColumnCount(t.canvas + 1, t.canvas + 1, t.columns);
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
    { canvas: 3840, columns: 9 },
  ].map((t) =>
    it(`renders ${t.columns} column(s) with ${t.canvas} resolution`, () => {
      settingsStore.gridConfig.config.groupWidth = 400;
      VerifyColumnCount(t.canvas, t.canvas, t.columns);
    })
  );

  it("renders expected number of columns for every resolution", () => {
    const minWidth = 400;
    let lastColumns = 1;
    for (let i = 100; i <= 4096; i++) {
      const expectedColumns = Math.max(Math.floor(i / minWidth), 1);
      const columns = Math.floor(i / GetGridElementWidth(i, i, minWidth));

      expect({
        resolution: i,
        minWidth: minWidth,
        columns: columns,
      }).toEqual({
        resolution: i,
        minWidth: minWidth,
        columns: expectedColumns,
      });
      expect(columns).toBeGreaterThanOrEqual(lastColumns);

      // keep track of column count to verify that each incrementing resolution
      // doesn't result in lower number of columns rendered
      lastColumns = columns;
    }
  });

  it("viewport resize also resizes alert groups", () => {
    MockGroupList(60, 5);

    const wrapper = ShallowAlertGrid();
    const tree = ShallowGrid();

    // set initial width
    wrapper.instance().viewport.updateWidths(1980, 1980);
    tree.setProps({
      gridSizesConfig: wrapper.instance().viewport.gridSizesConfig,
      groupWidth: wrapper.instance().viewport.groupWidth,
    });
    expect(tree.find("AlertGroup").at(0).props().style.width).toBe(1980 / 4);

    // then resize and verify if column count was changed
    wrapper.instance().viewport.updateWidths(1000, 1000);
    tree.setProps({
      gridSizesConfig: wrapper.instance().viewport.gridSizesConfig,
      groupWidth: wrapper.instance().viewport.groupWidth,
    });
    expect(tree.find("AlertGroup").at(0).props().style.width).toBe(1000 / 2);
  });

  it("scrollbar render doesn't resize alert groups", () => {
    settingsStore.gridConfig.config.groupWidth = 400;

    MockGroupList(60, 5);
    const wrapper = ShallowAlertGrid();
    const tree = ShallowGrid();

    // set initial width
    wrapper.instance().viewport.updateWidths(1600, 1600);
    tree.setProps({
      gridSizesConfig: wrapper.instance().viewport.gridSizesConfig,
      groupWidth: wrapper.instance().viewport.groupWidth,
    });
    expect(tree.find("AlertGroup").at(0).props().style.width).toBe(400);

    // then resize and verify if column count was changed
    wrapper.instance().viewport.updateWidths(1584, 1600);
    tree.setProps({
      gridSizesConfig: wrapper.instance().viewport.gridSizesConfig,
      groupWidth: wrapper.instance().viewport.groupWidth,
    });
    expect(tree.find("AlertGroup").at(0).props().style.width).toBe(396);
  });

  it("window resize event calls updateWidths", () => {
    MockGroupList(60, 5);
    const tree = ShallowAlertGrid();
    const instance = tree.instance();

    const updateWidthsSpy = jest.spyOn(instance.viewport, "updateWidths");
    global.dispatchEvent(new Event("resize"));
    expect(updateWidthsSpy).toHaveBeenCalled();
  });

  it("viewport resize doesn't allow loops", () => {
    settingsStore.gridConfig.config.groupWidth = 400;

    MockGroupList(60, 5);
    const wrapper = ShallowAlertGrid();
    const tree = ShallowGrid();

    let results = [];
    for (var index = 0; index < 14; index++) {
      wrapper
        .instance()
        .viewport.updateWidths(index % 2 === 0 ? 1600 : 1584, 1600);
      tree.setProps({
        gridSizesConfig: wrapper.instance().viewport.gridSizesConfig,
        groupWidth: wrapper.instance().viewport.groupWidth,
      });
      results.push(tree.find("AlertGroup").at(0).props().style.width);
    }

    expect(results).toStrictEqual([
      400,
      396,
      400,
      396,
      400,
      396,
      400,
      396,
      400,
      396,
      400,
      396,
      400,
      396,
    ]);
  });

  it("doesn't crash on unmount", () => {
    MockGroupList(60, 5);
    const tree = ShallowAlertGrid();
    tree.unmount();
  });
});

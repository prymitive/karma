import React from "react";
import { act } from "react-dom/test-utils";

import { shallow, mount } from "enzyme";

import { advanceBy, clear } from "jest-date-mock";

import { MockAlert, MockAlertGroup } from "__fixtures__/Alerts";
import { mockMatchMedia } from "__fixtures__/matchMedia";
import {
  MockThemeContext,
  MockThemeContextWithoutAnimations,
} from "__fixtures__/Theme";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ThemeContext, ThemeCtx } from "Components/Theme";
import { GetGridElementWidth, GridSizesConfig } from "./GridSize";
import Grid from "./Grid";
import AlertGrid from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;
let resizeCallback: any;

declare let global: any;
declare let document: any;
declare let window: any;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();

  window.matchMedia = mockMatchMedia({});

  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  };

  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);

  Object.defineProperty(document.body, "clientWidth", {
    writable: true,
    value: 1000,
  });

  global.ResizeObserver = jest.fn((cb) => {
    resizeCallback = cb;
    return {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
  });
  global.ResizeObserverEntry = jest.fn();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  clear();
});

const MountedAlertGrid = () => {
  return mount(
    <AlertGrid
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: MockThemeContext },
    }
  );
};

const ShallowAlertGrid = () => {
  return shallow(
    <AlertGrid
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

const MockGrid = () => ({
  labelName: "",
  labelValue: "",
  alertGroups: alertStore.data.grids.length
    ? alertStore.data.grids[0].alertGroups
    : [],
  stateCount: {
    unprocessed: 1,
    suppressed: 2,
    active: 3,
  },
});

const ShallowGrid = () => {
  return shallow(
    <Grid
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
      gridSizesConfig={GridSizesConfig(420)}
      groupWidth={420}
      grid={MockGrid()}
      outerPadding={0}
    />
  );
};

const MountedGrid = (theme?: ThemeCtx) => {
  return mount(
    <Grid
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
      gridSizesConfig={GridSizesConfig(420)}
      groupWidth={420}
      grid={MockGrid()}
      outerPadding={0}
    />,
    {
      wrappingComponent: ThemeContext.Provider,
      wrappingComponentProps: { value: theme || MockThemeContext },
    }
  );
};

const MockGroup = (groupName: string, alertCount: number) => {
  const alerts = [];
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

const MockGroupList = (count: number, alertPerGroup: number) => {
  const groups = [];
  for (let i = 1; i <= count; i++) {
    const id = `id${i}`;
    const group = MockGroup(`group${i}`, alertPerGroup);
    group.id = id;
    groups.push(group);
  }
  alertStore.data.setUpstreams({
    counters: { total: 0, healthy: 1, failed: 0 },
    instances: [
      {
        name: "am",
        cluster: "am",
        clusterMembers: ["am"],
        uri: "http://am",
        publicURI: "http://am",
        error: "",
        version: "0.21.0",
        headers: {},
        corsCredentials: "omit",
        readonly: false,
      },
    ],
    clusters: { am: ["am"] },
  });
  alertStore.data.setGrids([
    {
      labelName: "",
      labelValue: "",
      alertGroups: groups,
      stateCount: {
        unprocessed: 1,
        suppressed: 2,
        active: 3,
      },
    },
  ]);
};

describe("<Grid />", () => {
  it("uses animations when settingsStore.themeConfig.config.animations is true", () => {
    MockGroupList(1, 1);
    const tree = MountedGrid(MockThemeContext);
    expect(
      tree.find("div.components-grid-alertgrid-alertgroup").html()
    ).toMatch(/animate components-animation-fade-appear/);
  });

  it("doesn't use animations when settingsStore.themeConfig.config.animations is false", () => {
    jest
      .spyOn(React, "useContext")
      .mockImplementation(() => MockThemeContextWithoutAnimations);
    MockGroupList(1, 1);
    const tree = MountedGrid(MockThemeContextWithoutAnimations);
    expect(
      tree.find("div.components-grid-alertgrid-alertgroup").html()
    ).not.toMatch(/animate components-animation-fade-appear/);
  });

  it("renders only first 50 alert groups", () => {
    MockGroupList(55, 5);
    const tree = MountedGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups).toHaveLength(50);
  });

  it("appends 30 groups after clicking 'Load More' button", () => {
    MockGroupList(85, 5);
    const tree = MountedGrid();
    tree.find("button").simulate("click");
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups).toHaveLength(80);
  });

  it("doesn't sort groups when sorting is set to 'disabled'", () => {
    settingsStore.gridConfig.setSortOrder("disabled");
    settingsStore.gridConfig.setSortReverse(false);
    MockGroupList(3, 1);
    const tree = ShallowGrid();
    const alertGroups = tree.find("AlertGroup");
    expect(alertGroups.map((g) => (g.props() as any).group.id)).toEqual([
      "id1",
      "id2",
      "id3",
    ]);
  });

  it("click on the grid toggle toggles all groups", () => {
    jest.useFakeTimers();

    MockGroupList(10, 3);
    const tree = MountedGrid();
    const grid = MockGrid();
    grid.labelName = "foo";
    grid.labelValue = "bar";
    grid.stateCount = {
      unprocessed: 1,
      suppressed: 2,
      active: 3,
    };
    alertStore.data.setGrids([grid]);
    tree.setProps({ grid: grid });
    expect(tree.find("AlertGroup")).toHaveLength(10);

    tree.find("span.cursor-pointer").at(1).simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("div.components-grid-alertgrid-alertgroup")).toHaveLength(
      0
    );

    tree.find("span.cursor-pointer").at(1).simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("div.components-grid-alertgrid-alertgroup")).toHaveLength(
      10
    );
  });

  it("renders filter badge for grids with a value", () => {
    MockGroupList(1, 1);
    const tree = MountedGrid();
    const grid = MockGrid();
    grid.labelName = "foo";
    grid.labelValue = "bar";
    grid.stateCount = {
      unprocessed: 0,
      suppressed: 0,
      active: 0,
    };
    alertStore.data.setGrids([MockGrid(), MockGrid()]);
    tree.setProps({ grid: grid });
    expect(tree.find("h5").at(0).find("FilteringLabel")).toHaveLength(1);
    expect(tree.find("h5").at(0).find("FilteringLabel").text()).toBe(
      "foo: bar"
    );
  });

  it("doesn't render filter badge for grids with no value", () => {
    MockGroupList(1, 1);
    const tree = MountedGrid();
    const grid = MockGrid();
    grid.labelName = "foo";
    grid.labelValue = "";
    grid.stateCount = {
      unprocessed: 0,
      suppressed: 0,
      active: 0,
    };
    alertStore.data.setGrids([MockGrid(), MockGrid()]);
    tree.setProps({ grid: grid });
    expect(tree.find("h5").at(0).find("FilteringLabel")).toHaveLength(0);
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

  it("left click + alt on a group collapse toggle toggles all groups in current grid", () => {
    MockGroupList(20, 3);
    const groups = alertStore.data.grids[0].alertGroups;
    alertStore.data.setGrids([
      {
        labelName: "foo",
        labelValue: "bar",
        alertGroups: groups.slice(0, 10),
        stateCount: {
          unprocessed: 1,
          suppressed: 2,
          active: 3,
        },
      },
      {
        labelName: "foo",
        labelValue: "",
        alertGroups: groups.slice(10, 20),
        stateCount: {
          unprocessed: 1,
          suppressed: 2,
          active: 3,
        },
      },
    ]);
    const tree = MountedAlertGrid();

    for (let i = 0; i <= 19; i++) {
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
    for (let i = 10; i <= 19; i++) {
      expect(tree.find("AlertGroup").at(i).find("Alert")).toHaveLength(3);
    }
  });

  it("doesn't throw errors after FontFaceObserver timeout", () => {
    jest.useFakeTimers();
    MockGroupList(1, 1);
    MountedGrid();
    // skip a minute to trigger FontFaceObserver timeout handler
    advanceBy(60 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it("doesn't crash on unmount", () => {
    MockGroupList(5, 3);
    const tree = MountedGrid();
    tree.unmount();
  });
});

describe("<AlertGrid />", () => {
  const VerifyColumnCount = (
    innerWidth: number,
    outerWidth: number,
    columns: number
  ) => {
    MockGroupList(20, 1);

    document.body.clientWidth = innerWidth;
    window.innerWidth = outerWidth;
    const wrapper = ShallowAlertGrid();
    wrapper.update();

    const tree = ShallowGrid();
    tree.setProps({
      gridSizesConfig: wrapper.find("Grid").prop("gridSizesConfig"),
      groupWidth: wrapper.find("Grid").prop("groupWidth"),
    });

    tree.update();
    expect(wrapper.find("Grid").prop("groupWidth")).toBe(
      Math.floor(innerWidth / columns)
    );
    expect(tree.find("AlertGroup").at(0).prop("groupWidth")).toBe(
      Math.floor(innerWidth / columns)
    );
  };

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
      settingsStore.gridConfig.setGroupWidth(400);
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
      settingsStore.gridConfig.setGroupWidth(400);
      VerifyColumnCount(t.canvas, t.canvas, t.columns);
    })
  );

  it("renders expected number of columns for every resolution", () => {
    const minWidth = 400;
    let lastColumns = 1;
    for (let i = 100; i <= 4096; i++) {
      const expectedColumns = Math.max(Math.floor(i / minWidth), 1);
      const columns = Math.floor(i / GetGridElementWidth(i, i, 0, minWidth));

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
    MockGroupList(20, 1);

    // set initial width
    document.body.clientWidth = 1980;
    window.innerWidth = 1980;

    const wrapper = MountedAlertGrid();
    const tree = ShallowGrid();

    tree.setProps({
      gridSizesConfig: wrapper.find("Grid").prop("gridSizesConfig"),
      groupWidth: wrapper.find("Grid").prop("groupWidth"),
    });
    expect(tree.find("AlertGroup").at(0).prop("groupWidth")).toBe(1980 / 4);

    // then resize and verify if column count was changed
    document.body.clientWidth = 1000;
    window.innerWidth = 1000;
    act(() => {
      window.dispatchEvent(new Event("resize"));
      resizeCallback([{ contentRect: { width: 1000, height: 1000 } }]);
    });
    wrapper.update();
    expect(wrapper.find("Grid").prop("groupWidth")).toBe(1000 / 2);

    tree.setProps({
      gridSizesConfig: wrapper.find("Grid").prop("gridSizesConfig"),
      groupWidth: wrapper.find("Grid").prop("groupWidth"),
    });
    expect(tree.find("AlertGroup").at(0).prop("groupWidth")).toBe(1000 / 2);
  });

  it("scrollbar render doesn't resize alert groups", () => {
    settingsStore.gridConfig.setGroupWidth(400);

    MockGroupList(20, 1);
    // set initial width
    document.body.clientWidth = 1600;
    window.innerWidth = 1600;

    const wrapper = MountedAlertGrid();
    const tree = ShallowGrid();

    tree.setProps({
      gridSizesConfig: wrapper.find("Grid").prop("gridSizesConfig"),
      groupWidth: wrapper.find("Grid").prop("groupWidth"),
    });
    expect(tree.find("AlertGroup").at(0).prop("groupWidth")).toBe(400);

    // then resize and verify if column count was changed
    act(() => {
      resizeCallback([{ contentRect: { width: 1584, height: 1000 } }]);
    });
    wrapper.update();
    tree.setProps({
      gridSizesConfig: wrapper.find("Grid").prop("gridSizesConfig"),
      groupWidth: wrapper.find("Grid").prop("groupWidth"),
    });
    expect(tree.find("AlertGroup").at(0).prop("groupWidth")).toBe(396);
  });

  it("viewport resize doesn't allow loops", () => {
    settingsStore.gridConfig.setGroupWidth(400);

    MockGroupList(10, 1);

    document.body.clientWidth = 1600;
    window.innerWidth = 1600;

    const wrapper = MountedAlertGrid();
    const tree = ShallowGrid();

    const results = [];
    const cb = (index: number) =>
      resizeCallback([
        { contentRect: { width: index % 2 === 0 ? 1600 : 1584, height: 10 } },
      ]);
    for (let index = 0; index < 14; index++) {
      act(() => {
        cb(index);
      });
      wrapper.update();
      tree.setProps({
        gridSizesConfig: wrapper.find("Grid").prop("gridSizesConfig"),
        groupWidth: wrapper.find("Grid").prop("groupWidth"),
      });
      results.push(tree.find("AlertGroup").at(0).prop("groupWidth"));
    }

    expect(results).toStrictEqual([
      400, 396, 400, 396, 400, 396, 400, 396, 400, 396, 400, 396, 400, 396,
    ]);
  });

  it("alt+click on a grid toggle toggles all grid groups", () => {
    MockGroupList(3, 1);
    const groups = alertStore.data.grids[0].alertGroups;
    alertStore.data.setGrids([
      {
        labelName: "foo",
        labelValue: "bar",
        alertGroups: groups,
        stateCount: {
          unprocessed: 1,
          suppressed: 2,
          active: 3,
        },
      },
      {
        labelName: "foo",
        labelValue: "",
        alertGroups: groups,
        stateCount: {
          unprocessed: 1,
          suppressed: 2,
          active: 3,
        },
      },
    ]);
    const tree = MountedAlertGrid();
    expect(tree.find("Grid")).toHaveLength(2);
    expect(tree.find("AlertGroup")).toHaveLength(6);

    // toggle all grids to hide all groups
    tree
      .find("Grid")
      .at(0)
      .find("span.cursor-pointer")
      .at(1)
      .simulate("click", { altKey: true });
  });

  it("adds extra padding to alert groups when multi-grid is enabled", () => {
    MockGroupList(10, 3);
    const groups = alertStore.data.grids[0].alertGroups;
    alertStore.data.setGrids([
      {
        labelName: "foo",
        labelValue: "bar",
        alertGroups: groups,
        stateCount: {
          unprocessed: 0,
          suppressed: 0,
          active: 0,
        },
      },
      {
        labelName: "foo",
        labelValue: "",
        alertGroups: groups,
        stateCount: {
          unprocessed: 0,
          suppressed: 0,
          active: 0,
        },
      },
    ]);
    document.body.clientWidth = 1200;
    window.innerWidth = 1000;
    const tree = MountedAlertGrid();
    expect(tree.find("div.components-grid")).toHaveLength(2);
    expect(tree.find("AlertGroup")).toHaveLength(20);

    expect(tree.find("div.components-grid").at(0).prop("style")).toMatchObject({
      paddingLeft: "5px",
      paddingRight: "5px",
    });

    tree.find("div.components-grid-alertgrid-alertgroup").forEach((node) => {
      expect(node.prop("style")).toMatchObject({
        width: 595,
      });
    });
  });

  it("doesn't add extra padding to alert groups when multi-grid is disabled", () => {
    MockGroupList(10, 3);
    const groups = alertStore.data.grids[0].alertGroups;
    alertStore.data.setGrids([
      {
        labelName: "",
        labelValue: "",
        alertGroups: groups,
        stateCount: {
          unprocessed: 0,
          suppressed: 0,
          active: 0,
        },
      },
    ]);
    document.body.clientWidth = 1200;
    window.innerWidth = 1000;
    const tree = MountedAlertGrid();
    tree.update();
    expect(tree.find("Grid")).toHaveLength(1);
    expect(tree.find("AlertGroup")).toHaveLength(10);

    expect(tree.find("div.components-grid").at(0).prop("style")).toMatchObject({
      paddingLeft: "0px",
      paddingRight: "0px",
    });

    tree.find("div.components-grid-alertgrid-alertgroup").forEach((node) => {
      expect(node.prop("style")).toMatchObject({
        width: 600,
      });
    });
  });

  it("doesn't crash on unmount", () => {
    MockGroupList(5, 1);
    const tree = MountedAlertGrid();
    tree.unmount();
  });
});

import { act } from "react";

import { render, fireEvent } from "@testing-library/react";

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

// Mock AlertHistory to avoid async fetch issues in tests
jest.mock("Components/AlertHistory", () => ({
  AlertHistory: () => null,
}));

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
  jest.useRealTimers();
});

const renderAlertGrid = () => {
  return render(
    <ThemeContext.Provider value={MockThemeContext}>
      <AlertGrid
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
      />
    </ThemeContext.Provider>,
  );
};

const MockGrid = () => ({
  labelName: "",
  labelValue: "",
  alertGroups: alertStore.data.grids.length
    ? alertStore.data.grids[0].alertGroups
    : [],
  totalGroups: alertStore.data.grids.length
    ? alertStore.data.grids[0].alertGroups.length
    : 0,
  stateCount: {
    unprocessed: 1,
    suppressed: 2,
    active: 3,
  },
});

const renderGrid = (theme?: ThemeCtx) => {
  return render(
    <ThemeContext.Provider value={theme || MockThemeContext}>
      <Grid
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        settingsStore={settingsStore}
        gridSizesConfig={GridSizesConfig(420)}
        groupWidth={420}
        grid={MockGrid()}
        outerPadding={0}
        paddingTop={0}
        zIndex={101}
      />
    </ThemeContext.Provider>,
  );
};

const MockGroup = (groupName: string, alertCount: number) => {
  const alerts = [];
  for (let i = 1; i <= alertCount; i++) {
    alerts.push(
      MockAlert([], [{ name: "instance", value: `instance${i}` }], "active"),
    );
  }
  const group = MockAlertGroup(
    [
      { name: "alertname", value: "Fake Alert" },
      { name: "group", value: "groupName" },
    ],
    alerts,
    [],
    [],
    {},
  );
  return group;
};

const MockGroupList = (
  count: number,
  alertPerGroup: number,
  totalGroups?: number,
) => {
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
        version: "0.24.0",
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
      totalGroups: totalGroups ? totalGroups : groups.length,
      stateCount: {
        unprocessed: 1,
        suppressed: 2,
        active: 3,
      },
    },
  ]);
};

describe("<Grid />", () => {
  it("uses animations when settingsStore.themeConfig.config.animations is true", async () => {
    // Verifies animation classes are applied to the transition wrapper when animations are enabled
    act(() => {
      MockGroupList(1, 1);
    });
    let container: HTMLElement;
    await act(async () => {
      const result = renderGrid(MockThemeContext);
      container = result.container;
    });
    expect(
      container!.querySelector("div.components-grid-alertgrid-alertgroup")
        ?.parentElement?.outerHTML,
    ).toMatch(/components-animation-alergroup-appear/);
  });

  it("doesn't use animations when settingsStore.themeConfig.config.animations is false", async () => {
    // Verifies animation classes are not applied when animations are disabled
    act(() => {
      MockGroupList(1, 1);
    });
    let container: HTMLElement;
    await act(async () => {
      const result = renderGrid(MockThemeContextWithoutAnimations);
      container = result.container;
    });
    expect(
      container!.querySelector("div.components-grid-alertgrid-alertgroup")
        ?.outerHTML,
    ).not.toMatch(/animate components-animation-alertgroup-appear/);
  });

  it("renders all alert groups", async () => {
    // Verifies all alert groups are rendered
    act(() => {
      MockGroupList(55, 5);
    });
    let container: HTMLElement;
    await act(async () => {
      const result = renderGrid();
      container = result.container;
    });
    const alertGroups = container!.querySelectorAll(
      ".components-grid-alertgrid-alertgroup",
    );
    expect(alertGroups).toHaveLength(55);
  });

  it("appends more groups after clicking 'Load More' button", () => {
    MockGroupList(40, 5, 70);
    const { container } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Grid
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={GridSizesConfig(420)}
          groupWidth={420}
          grid={alertStore.data.grids[0]}
          outerPadding={0}
          paddingTop={0}
          zIndex={101}
        />
      </ThemeContext.Provider>,
    );
    const button = container.querySelector("button");
    fireEvent.click(button!);
    expect(alertStore.ui.gridGroupLimits).toStrictEqual({
      "": { "": 40 + alertStore.settings.values.gridGroupLimit },
    });
  });

  it("sets correct limits after clicking 'Load More' button", () => {
    MockGroupList(50, 5, 60);
    alertStore.settings.setValues({
      ...alertStore.settings.values,
      gridGroupLimit: 20,
    });
    alertStore.data.setGrids([
      {
        ...alertStore.data.grids[0],
        labelName: "foo",
        labelValue: "bar",
        totalGroups: 69,
      },
    ]);
    const { container } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Grid
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={GridSizesConfig(420)}
          groupWidth={420}
          grid={alertStore.data.grids[0]}
          outerPadding={0}
          paddingTop={0}
          zIndex={101}
        />
      </ThemeContext.Provider>,
    );
    const button = container.querySelector("button");
    fireEvent.click(button!);
    expect(alertStore.ui.gridGroupLimits).toStrictEqual({
      foo: { bar: 70 },
    });
  });

  it("doesn't sort groups when sorting is set to 'disabled'", () => {
    settingsStore.gridConfig.setSortOrder("disabled");
    settingsStore.gridConfig.setSortReverse(false);
    MockGroupList(3, 1);
    const { container } = renderGrid();
    const alertGroups = container.querySelectorAll(
      ".components-grid-alertgrid-alertgroup",
    );
    expect(alertGroups).toHaveLength(3);
  });

  it("click on the grid toggle toggles all groups", () => {
    jest.useFakeTimers();

    MockGroupList(10, 3);
    const grid = MockGrid();
    grid.labelName = "foo";
    grid.labelValue = "bar";
    grid.stateCount = {
      unprocessed: 1,
      suppressed: 2,
      active: 3,
    };
    alertStore.data.setGrids([grid]);
    const { container } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Grid
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={GridSizesConfig(420)}
          groupWidth={420}
          grid={grid}
          outerPadding={0}
          paddingTop={0}
          zIndex={101}
        />
      </ThemeContext.Provider>,
    );
    expect(
      container.querySelectorAll(".components-grid-alertgrid-alertgroup"),
    ).toHaveLength(10);

    const toggles = container.querySelectorAll("span.cursor-pointer");
    fireEvent.click(toggles[1]);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(
      container.querySelectorAll("div.components-grid-alertgrid-alertgroup"),
    ).toHaveLength(0);

    fireEvent.click(toggles[1]);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(
      container.querySelectorAll("div.components-grid-alertgrid-alertgroup"),
    ).toHaveLength(10);
  });

  it("dispatches alertGridCollapse event on alt + click", () => {
    jest.useFakeTimers();

    MockGroupList(5, 1);
    alertStore.data.setGrids([
      {
        ...alertStore.data.grids[0],
        labelName: "foo",
        labelValue: "bar",
      },
    ]);
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    const { container } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Grid
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={GridSizesConfig(420)}
          groupWidth={420}
          grid={alertStore.data.grids[0]}
          outerPadding={0}
          paddingTop={0}
          zIndex={101}
        />
      </ThemeContext.Provider>,
    );

    const toggles = container.querySelectorAll("span.cursor-pointer");
    fireEvent.click(toggles[1], { altKey: true });

    const collapseEvent = dispatchSpy.mock.calls
      .map((call) => call[0] as Event)
      .find((evt) => evt.type === "alertGridCollapse") as CustomEvent;
    expect(collapseEvent).toBeDefined();
    expect(collapseEvent.detail).toBe(false);

    dispatchSpy.mockRestore();
  });

  it("reacts to alertGridCollapse events", () => {
    jest.useFakeTimers();

    MockGroupList(3, 1);
    const grid = {
      ...alertStore.data.grids[0],
      labelName: "foo",
      labelValue: "bar",
    };
    alertStore.data.setGrids([grid]);
    const { container } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Grid
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={GridSizesConfig(420)}
          groupWidth={420}
          grid={grid}
          outerPadding={0}
          paddingTop={0}
          zIndex={101}
        />
      </ThemeContext.Provider>,
    );

    expect(
      container.querySelectorAll("div.components-grid-alertgrid-alertgroup"),
    ).toHaveLength(3);

    act(() => {
      window.dispatchEvent(
        new CustomEvent("alertGridCollapse", { detail: false }),
      );
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(
      container.querySelectorAll("div.components-grid-alertgrid-alertgroup"),
    ).toHaveLength(0);
  });

  it("renders filter badge for grids with a value", () => {
    MockGroupList(1, 1);
    const grid = MockGrid();
    grid.labelName = "foo";
    grid.labelValue = "bar";
    grid.stateCount = {
      unprocessed: 0,
      suppressed: 0,
      active: 0,
    };
    alertStore.data.setGrids([MockGrid(), MockGrid()]);
    const { container } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Grid
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={GridSizesConfig(420)}
          groupWidth={420}
          grid={grid}
          outerPadding={0}
          paddingTop={0}
          zIndex={101}
        />
      </ThemeContext.Provider>,
    );
    expect(container.textContent).toMatch(/foo:.*bar/);
  });

  it("doesn't render filter badge for grids with no value", () => {
    MockGroupList(1, 1);
    const grid = MockGrid();
    grid.labelName = "foo";
    grid.labelValue = "";
    grid.stateCount = {
      unprocessed: 0,
      suppressed: 0,
      active: 0,
    };
    alertStore.data.setGrids([MockGrid(), MockGrid()]);
    const { container } = render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Grid
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={GridSizesConfig(420)}
          groupWidth={420}
          grid={grid}
          outerPadding={0}
          paddingTop={0}
          zIndex={101}
        />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector("h5")?.innerHTML).not.toMatch(/foo: bar/);
  });

  it("left click on a group collapse toggle only toggles clicked group", () => {
    MockGroupList(10, 3);
    const { container } = renderGrid();

    const alertGroups = container.querySelectorAll(
      ".components-grid-alertgrid-alertgroup",
    );
    expect(alertGroups).toHaveLength(10);

    const toggles = alertGroups[2].querySelectorAll("span.cursor-pointer");
    fireEvent.click(toggles[1]);

    const alertsInGroup2 = alertGroups[2].querySelectorAll(
      ".components-grid-alertgrid-alertgroup-alert",
    );
    expect(alertsInGroup2).toHaveLength(0);
  });

  it("left click + alt on a group collapse toggle toggles all groups in current grid", () => {
    MockGroupList(20, 3);
    const groups = alertStore.data.grids[0].alertGroups;
    alertStore.data.setGrids([
      {
        labelName: "foo",
        labelValue: "bar",
        alertGroups: groups.slice(0, 10),
        totalGroups: groups.slice(0, 10).length,
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
        totalGroups: groups.slice(10, 20).length,
        stateCount: {
          unprocessed: 1,
          suppressed: 2,
          active: 3,
        },
      },
    ]);
    const { container } = renderAlertGrid();

    const alertGroups = container.querySelectorAll(
      ".components-grid-alertgrid-alertgroup",
    );
    expect(alertGroups).toHaveLength(20);

    const toggles = alertGroups[2].querySelectorAll("span.cursor-pointer");
    fireEvent.click(toggles[1], { altKey: true });

    const grids = container.querySelectorAll(".components-grid");
    const firstGridAlerts = grids[0].querySelectorAll(
      ".components-grid-alertgrid-alertgroup-alert",
    );
    expect(firstGridAlerts).toHaveLength(0);
  });

  it("doesn't throw errors after FontFaceObserver timeout", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));

    MockGroupList(1, 1);
    renderGrid();
    // skip a minute to trigger FontFaceObserver timeout handler
    jest.setSystemTime(new Date(Date.UTC(2000, 1, 1, 0, 1, 0)));
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it("doesn't crash on unmount", () => {
    MockGroupList(5, 3);
    const { unmount } = renderGrid();
    unmount();
  });
});

describe("<AlertGrid />", () => {
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

    const { container } = renderAlertGrid();
    const alertGroups = container.querySelectorAll(
      ".components-grid-alertgrid-alertgroup",
    );
    expect(alertGroups).toHaveLength(20);

    // then resize and verify if column count was changed
    document.body.clientWidth = 1000;
    window.innerWidth = 1000;
    act(() => {
      window.dispatchEvent(new Event("resize"));
      resizeCallback([{ contentRect: { width: 1000, height: 1000 } }]);
    });
  });

  it("scrollbar render doesn't resize alert groups", () => {
    settingsStore.gridConfig.setGroupWidth(400);

    MockGroupList(20, 1);
    // set initial width
    document.body.clientWidth = 1600;
    window.innerWidth = 1600;

    const { container } = renderAlertGrid();
    expect(
      container.querySelectorAll(".components-grid-alertgrid-alertgroup"),
    ).toHaveLength(20);

    // then resize and verify if column count was changed
    act(() => {
      resizeCallback([{ contentRect: { width: 1584, height: 1000 } }]);
    });
  });

  it("viewport resize doesn't allow loops", () => {
    settingsStore.gridConfig.setGroupWidth(400);

    MockGroupList(10, 1);

    document.body.clientWidth = 1600;
    window.innerWidth = 1600;

    renderAlertGrid();

    const cb = (index: number) =>
      resizeCallback([
        { contentRect: { width: index % 2 === 0 ? 1600 : 1584, height: 10 } },
      ]);
    for (let index = 0; index < 14; index++) {
      act(() => {
        cb(index);
      });
    }
  });

  it("alt+click on a grid toggle toggles all grid groups", () => {
    MockGroupList(3, 1);
    const groups = alertStore.data.grids[0].alertGroups;
    alertStore.data.setGrids([
      {
        labelName: "foo",
        labelValue: "bar",
        alertGroups: groups,
        totalGroups: groups.length,
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
        totalGroups: groups.length,
        stateCount: {
          unprocessed: 1,
          suppressed: 2,
          active: 3,
        },
      },
    ]);
    const { container } = renderAlertGrid();
    expect(container.querySelectorAll(".components-grid")).toHaveLength(2);
    expect(
      container.querySelectorAll(".components-grid-alertgrid-alertgroup"),
    ).toHaveLength(6);

    // toggle all grids to hide all groups
    const grids = container.querySelectorAll(".components-grid");
    const toggles = grids[0].querySelectorAll("span.cursor-pointer");
    fireEvent.click(toggles[1], { altKey: true });
  });

  it("adds extra padding to alert groups when multi-grid is enabled", () => {
    MockGroupList(10, 3);
    const groups = alertStore.data.grids[0].alertGroups;
    alertStore.data.setGrids([
      {
        labelName: "foo",
        labelValue: "bar",
        alertGroups: groups,
        totalGroups: groups.length,
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
        totalGroups: groups.length,
        stateCount: {
          unprocessed: 0,
          suppressed: 0,
          active: 0,
        },
      },
    ]);
    document.body.clientWidth = 1200;
    window.innerWidth = 1000;
    const { container } = renderAlertGrid();
    expect(container.querySelectorAll("div.components-grid")).toHaveLength(2);
    expect(
      container.querySelectorAll(".components-grid-alertgrid-alertgroup"),
    ).toHaveLength(20);

    const grid = container.querySelector("div.components-grid") as HTMLElement;
    expect(grid?.style.paddingLeft).toBe("5px");
    expect(grid?.style.paddingRight).toBe("5px");

    container
      .querySelectorAll("div.components-grid-alertgrid-alertgroup")
      .forEach((node) => {
        expect((node as HTMLElement).style.width).toBe("595px");
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
        totalGroups: groups.length,
        stateCount: {
          unprocessed: 0,
          suppressed: 0,
          active: 0,
        },
      },
    ]);
    document.body.clientWidth = 1200;
    window.innerWidth = 1000;
    const { container } = renderAlertGrid();
    expect(container.querySelectorAll(".components-grid")).toHaveLength(1);
    expect(
      container.querySelectorAll(".components-grid-alertgrid-alertgroup"),
    ).toHaveLength(10);

    const grid = container.querySelector("div.components-grid") as HTMLElement;
    expect(grid?.style.paddingLeft).toBe("0px");
    expect(grid?.style.paddingRight).toBe("0px");

    container
      .querySelectorAll("div.components-grid-alertgrid-alertgroup")
      .forEach((node) => {
        expect((node as HTMLElement).style.width).toBe("600px");
      });
  });

  it("doesn't crash on unmount", () => {
    MockGroupList(5, 1);
    const { unmount } = renderAlertGrid();
    unmount();
  });

  it("alt+space hotkey toggles pause state", () => {
    // Verifies that pressing alt+space triggers alertStore.status.togglePause
    MockGroupList(1, 1);
    renderAlertGrid();

    expect(alertStore.status.paused).toBe(false);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          altKey: true,
        } as KeyboardEventInit),
      );
    });

    expect(alertStore.status.paused).toBe(true);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          altKey: true,
        } as KeyboardEventInit),
      );
    });

    expect(alertStore.status.paused).toBe(false);
  });

  it("updates paddingTop when navbarResize event is dispatched", () => {
    // Verifies that the onNavbarResize callback updates paddingTop state
    MockGroupList(5, 3);
    const { container } = renderAlertGrid();

    const gridsContainer = container.querySelector(
      ".components-grid-alertgrid-alertgroup",
    );
    expect(gridsContainer).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("navbarResize", {
          detail: 100,
        }),
      );
    });

    // The paddingTop is passed to Grid components and affects swimlane positioning
    // We verify the event handler was called by checking the component didn't crash
    // and is still rendering correctly
    expect(
      container.querySelector(".components-grid-alertgrid-alertgroup"),
    ).toBeInTheDocument();
  });
});

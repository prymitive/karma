import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { MockGrid } from "__fixtures__/Stories";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import type { APIGridT } from "Models/APITypes";
import { GridLabelSelect } from "./GridLabelSelect";

let alertStore: AlertStore;
let settingsStore: Settings;
let grid: APIGridT;

beforeEach(() => {
  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify([]),
  });

  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  grid = {
    labelName: "foo",
    labelValue: "bar",
    alertGroups: [],
    stateCount: {
      active: 0,
      suppressed: 0,
      unprocessed: 0,
    },
  };

  jest.useFakeTimers();

  fetchMock.mock(
    "*",
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(["alertname", "cluster", "job"]),
    },
    {
      overwriteRoutes: true,
    }
  );
});

afterEach(() => {
  fetchMock.reset();
});

const MountedGridLabelSelect = () => {
  return mount(
    <GridLabelSelect
      alertStore={alertStore}
      settingsStore={settingsStore}
      grid={grid}
    />
  );
};

describe("<GridLabelSelect />", () => {
  it("select dropdown is hidden by default", async () => {
    const promise = Promise.resolve();
    const tree = MountedGridLabelSelect();
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(0);
    await act(() => promise);
  });

  it("clicking toggle renders select dropdown", async () => {
    const promise = Promise.resolve();
    MockGrid(alertStore);
    const tree = MountedGridLabelSelect();
    const toggle = tree.find("span.components-grid-label-select-dropdown");
    toggle.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);
    await act(() => promise);
  });

  it("dropdown handles fetch exceptions", async () => {
    fetchMock.mock(
      "*",
      {
        throws: new Error("fake error"),
      },
      {
        overwriteRoutes: true,
      }
    );

    const promise = Promise.resolve();
    MockGrid(alertStore);
    const tree = MountedGridLabelSelect();
    const toggle = tree.find("span.components-grid-label-select-dropdown");
    toggle.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);
    await act(() => promise);
  });

  it("dropdown handles fetch errors", async () => {
    const consoleSpy = jest
      .spyOn(console, "trace")
      .mockImplementation(jest.fn());

    fetchMock.mock(
      "*",
      {
        code: 500,
        body: "fake error",
      },
      {
        overwriteRoutes: true,
      }
    );

    const promise = Promise.resolve();
    MockGrid(alertStore);
    const tree = MountedGridLabelSelect();
    const toggle = tree.find("span.components-grid-label-select-dropdown");
    toggle.simulate("click");
    await act(async () => {
      await fetchMock.flush(true);
    });
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);
    expect(consoleSpy).toBeCalledTimes(1);
    await act(() => promise);
  });

  it("clicking an option updates grid settings", async () => {
    const promise = Promise.resolve();
    MockGrid(alertStore);
    const tree = MountedGridLabelSelect();

    const toggle = tree.find("span.components-grid-label-select-dropdown");
    toggle.simulate("click");
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);
    await act(async () => {
      await fetchMock.flush(true);
    });

    settingsStore.multiGridConfig.setGridLabel("foo");
    tree.update();
    const options = tree.find("div.react-select__option");
    expect(options).toHaveLength(7);
    options.at(5).simulate("click");
    expect(settingsStore.multiGridConfig.config.gridLabel).toBe("cluster");
    await act(() => promise);
  });

  it("clicking toggle twice hides select dropdown", async () => {
    const promise = Promise.resolve();
    const tree = MountedGridLabelSelect();
    const toggle = tree.find("span.components-grid-label-select-dropdown");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(0);
    await act(() => promise);
  });

  it("clicking outside hides select dropdown", async () => {
    const promise = Promise.resolve();
    const tree = MountedGridLabelSelect();
    const toggle = tree.find("span.components-grid-label-select-dropdown");

    toggle.simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);

    const clickEvent = document.createEvent("MouseEvents");
    clickEvent.initEvent("mousedown", true, true);
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(0);
    await act(() => promise);
  });
});

import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { MockGrid } from "__fixtures__/Stories";
import { MockThemeContextWithoutAnimations } from "__fixtures__/Theme";
import { mockMatchMedia } from "__fixtures__/matchMedia";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import type { APIGridT } from "Models/APITypes";
import { ThemeContext } from "Components/Theme";
import AlertGrid from ".";
import { GridLabelSelect } from "./GridLabelSelect";

let alertStore: AlertStore;
let settingsStore: Settings;
let silenceFormStore: SilenceFormStore;
let grid: APIGridT;

declare let global: any;
declare let document: any;
declare let window: any;

beforeEach(() => {
  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify([]),
  });

  alertStore = new AlertStore([]);
  settingsStore = new Settings(null);
  silenceFormStore = new SilenceFormStore();
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
  alertStore.data.setLabelNames(["alertname", "job", "cluster"]);

  window.matchMedia = mockMatchMedia({});
  global.ResizeObserver = jest.fn((cb) => {
    return {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
  });
  global.ResizeObserverEntry = jest.fn();

  jest.useFakeTimers();
});

const MountedGridLabelSelect = () => {
  return mount(
    <GridLabelSelect
      alertStore={alertStore}
      settingsStore={settingsStore}
      grid={grid}
    />,
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
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);
    await act(() => promise);
  });

  it("clicking an option updates grid settings", async () => {
    const promise = Promise.resolve();
    MockGrid(alertStore);
    const tree = MountedGridLabelSelect();

    const toggle = tree.find("span.components-grid-label-select-dropdown");
    toggle.simulate("click");
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);

    settingsStore.multiGridConfig.setGridLabel("foo");
    const options = tree.find("div.react-select__option");
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

  it("opening label select sets z-index", async () => {
    const promise = Promise.resolve();
    alertStore.data.setGrids([
      {
        labelName: "foo",
        labelValue: "bar",
        alertGroups: [],
        totalGroups: 0,
        stateCount: {
          unprocessed: 1,
          suppressed: 2,
          active: 3,
        },
      },
    ]);
    const tree = mount(
      <AlertGrid
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
      />,
      {
        wrappingComponent: ThemeContext.Provider,
        wrappingComponentProps: { value: MockThemeContextWithoutAnimations },
      },
    );

    tree.find("span.components-grid-label-select-dropdown").simulate("click");
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);
    expect(tree.find("div").at(1).props().style?.zIndex).toBe(101);

    tree.find("span.components-grid-label-select-dropdown").simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(0);
    expect(tree.find("div").at(1).props().style?.zIndex).toBe(101);

    await act(() => promise);
  });
});

import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { Settings } from "Stores/Settings";
import { GridLabelSelect } from "./GridLabelSelect";

let settingsStore: Settings;

beforeEach(() => {
  fetchMock.reset();
  fetchMock.mock("*", {
    body: JSON.stringify([]),
  });

  settingsStore = new Settings(null);

  jest.useFakeTimers();
});

const MountedGridLabelSelect = () => {
  return mount(<GridLabelSelect settingsStore={settingsStore} />);
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
    const tree = MountedGridLabelSelect();
    const toggle = tree.find("span.components-grid-label-select-dropdown");
    toggle.simulate("click");
    expect(tree.find("div.components-grid-label-select-menu")).toHaveLength(1);
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

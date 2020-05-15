import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";
import { MainModal } from ".";

let alertStore;
let settingsStore;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();

  fetchMock.reset();
  fetchMock.any({
    body: JSON.stringify([]),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.reset();
});

const MountedMainModal = () => {
  return mount(
    <ThemeContext.Provider
      value={{
        reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
      }}
    >
      <MainModal alertStore={alertStore} settingsStore={settingsStore} />
    </ThemeContext.Provider>
  );
};

describe("<MainModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const tree = MountedMainModal();
    expect(tree.find("FontAwesomeIcon")).toHaveLength(1);
    expect(tree.find("MainModalContent")).toHaveLength(0);
  });

  it("renders a spinner placeholder while modal content is loading", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.find("FontAwesomeIcon")).not.toHaveLength(0);
    expect(tree.find("MainModalContent")).toHaveLength(0);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
  });

  it("renders modal content if fallback is not used", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.find("FontAwesomeIcon")).not.toHaveLength(0);
    expect(tree.find("MainModalContent")).toHaveLength(1);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(0);
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    expect(tree.find("MainModalContent")).toHaveLength(1);

    toggle.simulate("click");
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    expect(tree.find("MainModalContent")).toHaveLength(0);
  });

  it("hides the modal when button.close is clicked", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    expect(tree.find("MainModalContent")).toHaveLength(1);

    tree.find("button.close").simulate("click");
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    expect(tree.find("MainModalContent")).toHaveLength(0);
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    tree.unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import { ThemeContext } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore, SilenceFormStage } from "Stores/SilenceFormStore";
import { SilenceModal } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeAll(() => {
  jest.useFakeTimers();
  fetchMock.any({
    body: JSON.stringify([]),
  });
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
});

afterEach(() => {
  document.body.className = "";
});

const MountedSilenceModal = () => {
  return mount(
    <ThemeContext.Provider
      value={{
        reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
      }}
    >
      <SilenceModal
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        settingsStore={settingsStore}
      />
    </ThemeContext.Provider>
  );
};

describe("<SilenceModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const tree = MountedSilenceModal();
    expect(tree.find("FontAwesomeIcon")).toHaveLength(1);
    expect(tree.find("SilenceModalContent")).toHaveLength(0);
  });

  it("renders a spinner placeholder while modal content is loading", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.find("FontAwesomeIcon")).not.toHaveLength(0);
    expect(tree.find("SilenceModalContent")).toHaveLength(0);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
  });

  it("renders a spinner placeholder after modal content load but no upstreams", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.find("FontAwesomeIcon")).not.toHaveLength(0);
    expect(tree.find("SilenceModalContent")).toHaveLength(1);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
  });

  it("renders modal content if fallback is not used", () => {
    alertStore.data.upstreams = {
      counters: { total: 1, healthy: 0, failed: 0 },
      instances: [
        {
          name: "dev",
          cluster: "dev",
          uri: "http://localhost:9093",
          error: "",
        },
      ],
      clusters: { dev: ["dev"] },
    };
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.find("FontAwesomeIcon")).not.toHaveLength(0);
    expect(tree.find("SilenceModalContent")).toHaveLength(1);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(0);
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    expect(tree.find("SilenceModalContent")).toHaveLength(1);

    toggle.simulate("click");
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    expect(tree.find("SilenceModalContent")).toHaveLength(0);
  });

  it("hides the modal when hide() is called", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    expect(tree.find("SilenceModalContent")).toHaveLength(1);

    silenceFormStore.toggle.hide();
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    expect(tree.find("SilenceModalContent")).toHaveLength(0);
  });

  it("resets progress on hide", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");

    // mark form as dirty, resetProgress() should change this value to false
    silenceFormStore.data.wasValidated = true;
    // disable autofill, closing modal should re-enable it
    silenceFormStore.data.autofillMatchers = false;

    // click to hide
    toggle.simulate("click");
    // wait for animation to finish
    act(() => jest.runOnlyPendingTimers());
    tree.update();
    // form should be reset
    expect(silenceFormStore.data.currentStage).toBe(SilenceFormStage.UserInput);
    expect(silenceFormStore.data.wasValidated).toBe(false);
    expect(silenceFormStore.data.autofillMatchers).toBe(true);
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");

    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");

    toggle.simulate("click");
    act(() => jest.runOnlyPendingTimers());
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    tree.unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is preserved on body node after remountModal is called", () => {
    let callbacks = [];
    jest.spyOn(React, "useCallback").mockImplementation((fn) => {
      callbacks.push(fn);
      return fn;
    });

    silenceFormStore.toggle.visible = true;
    MountedSilenceModal();

    expect(callbacks.length).toBeGreaterThan(0);
    act(() => {
      callbacks.forEach((f) => f());
    });
    expect(document.body.className.split(" ")).toContain("modal-open");
  });
});

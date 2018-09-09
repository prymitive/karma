import React from "react";

import { shallow, mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceModal } from ".";

let alertStore;
let settingsStore;
let silenceFormStore;

beforeAll(() => {
  fetch.mockResponse(JSON.stringify([]));
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
  silenceFormStore = new SilenceFormStore();
});

const ShallowSilenceModal = () => {
  return shallow(
    <SilenceModal
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
    />
  );
};

const MountedSilenceModal = () => {
  return mount(
    <SilenceModal
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      settingsStore={settingsStore}
    />
  );
};

describe("<SilenceModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const tree = ShallowSilenceModal();
    expect(tree.text()).toBe("<FontAwesomeIcon />");
  });

  it("renders the modal when it is shown", () => {
    const tree = ShallowSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon /><SilenceModalContent />");
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = ShallowSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon />");
  });

  it("hides the modal when hide() is called", () => {
    const tree = ShallowSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon /><SilenceModalContent />");
    silenceFormStore.toggle.hide();
    expect(tree.text()).toBe("<FontAwesomeIcon />");
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
    toggle.simulate("click");
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedSilenceModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    tree.unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("inProgress is set to false after modal is hidden", () => {
    silenceFormStore.toggle.visible = true;
    const tree = MountedSilenceModal();
    silenceFormStore.data.inProgress = true;
    const toggle = tree.find("button.close");
    toggle.simulate("click");
    expect(silenceFormStore.data.inProgress).toBe(false);
  });
});

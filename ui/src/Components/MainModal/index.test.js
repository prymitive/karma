import React from "react";

import { shallow, mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { MainModal } from ".";

let alertStore;
let settingsStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
});

const ShallowMainModal = () => {
  return shallow(
    <MainModal alertStore={alertStore} settingsStore={settingsStore} />
  );
};

const MountedMainModal = () => {
  return mount(
    <MainModal alertStore={alertStore} settingsStore={settingsStore} />
  );
};

describe("<MainModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const tree = ShallowMainModal();
    expect(tree.text()).toBe("<FontAwesomeIcon />");
  });

  it("renders the modal when it is shown", () => {
    const tree = ShallowMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon /><MainModalContent />");
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = ShallowMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon />");
  });

  it("hides the modal when hide() is called", () => {
    const tree = ShallowMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon /><MainModalContent />");
    const instance = tree.instance();
    instance.toggle.hide();
    expect(tree.text()).toBe("<FontAwesomeIcon />");
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

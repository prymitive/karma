import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { MainModal } from ".";

let alertStore;
let settingsStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  settingsStore = new Settings();
});

const RenderMainModal = () => {
  return shallow(
    <MainModal alertStore={alertStore} settingsStore={settingsStore} />
  );
};

describe("<MainModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const tree = RenderMainModal();
    expect(tree.text()).toBe("<FontAwesomeIcon />");
  });

  it("renders the modal when it is shown", () => {
    const tree = RenderMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon /><MainModalContent />");
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = RenderMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon />");
  });

  it("hides the modal when hide() is called", () => {
    const tree = RenderMainModal();
    const toggle = tree.find(".nav-link");
    toggle.simulate("click");
    expect(tree.text()).toBe("<FontAwesomeIcon /><MainModalContent />");
    const instance = tree.instance();
    instance.toggle.hide();
    expect(tree.text()).toBe("<FontAwesomeIcon />");
  });
});

import React from "react";
import sd from "skin-deep";

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
  return sd.shallowRender(
    <MainModal alertStore={alertStore} settingsStore={settingsStore} />
  );
};

describe("<MainModal />", () => {
  it("only renders FontAwesomeIcon when modal is not shown", () => {
    const tree = RenderMainModal();
    // <Unknown/> is how React.Fragment gets rendered
    expect(tree.text()).toBe("<Unknown /><FontAwesomeIcon />");
  });

  it("renders the modal when it is shown", () => {
    const tree = RenderMainModal();
    const instance = tree.getMountedInstance();
    instance.toggle.toggle();
    // <Unknown/> is how React.Fragment gets rendered
    expect(tree.text()).toBe(
      "<Unknown /><FontAwesomeIcon /><MainModalContent />"
    );
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = RenderMainModal();
    const instance = tree.getMountedInstance();
    instance.toggle.toggle();
    instance.toggle.toggle();
    expect(tree.text()).toBe("<Unknown /><FontAwesomeIcon />");
  });

  it("hides the modal when hide() is called", () => {
    const tree = RenderMainModal();
    const instance = tree.getMountedInstance();
    instance.toggle.show = true;
    instance.toggle.hide();
    expect(tree.text()).toBe("<Unknown /><FontAwesomeIcon />");
  });
});

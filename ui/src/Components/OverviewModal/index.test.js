import React from "react";

import { mount } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { OverviewModal } from ".";

let alertStore;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedOverviewModal = () => {
  return mount(<OverviewModal alertStore={alertStore} />);
};

describe("<OverviewModal />", () => {
  it("only renders the counter when modal is not shown", () => {
    const tree = MountedOverviewModal();
    expect(tree.text()).toBe("0");
    expect(tree.find("OverviewModalContent")).toHaveLength(0);
  });

  it("renders a spinner placeholder while modal content is loading", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(tree.find("OverviewModalContent")).toHaveLength(0);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(1);
  });

  it("renders modal content if fallback is not used", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(tree.find("OverviewModalContent")).toHaveLength(1);
    expect(tree.find(".modal-content").find("svg.fa-spinner")).toHaveLength(0);
  });

  it("hides the modal when toggle() is called twice", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");

    toggle.simulate("click");
    jest.runOnlyPendingTimers();
    tree.update();
    expect(tree.find("OverviewModalContent")).toHaveLength(1);

    toggle.simulate("click");
    jest.runOnlyPendingTimers();
    tree.update();
    expect(tree.find("OverviewModalContent")).toHaveLength(0);
  });

  it("hides the modal when hide() is called", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");

    toggle.simulate("click");
    expect(tree.find("OverviewModalContent")).toHaveLength(1);

    const instance = tree.instance();
    instance.toggle.hide();
    jest.runOnlyPendingTimers();
    tree.update();
    expect(tree.find("OverviewModalContent")).toHaveLength(0);
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    toggle.simulate("click");
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedOverviewModal();
    const toggle = tree.find("div.navbar-brand");
    toggle.simulate("click");
    tree.unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

import React from "react";

import { mount } from "enzyme";

import { Modal } from ".";

const MountedModal = isOpen => {
  return mount(
    <Modal isOpen={isOpen}>
      <div />
    </Modal>
  );
};

describe("<Modal />", () => {
  it("'modal-open' class is appended to body node when modal is visible", () => {
    MountedModal(true);
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is hidden", () => {
    MountedModal(false);
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedModal(true);
    tree.unmount();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

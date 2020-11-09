import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { PressKey } from "__fixtures__/PressKey";
import { Modal, ModalInner } from ".";

beforeEach(() => {
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  document.body.className = "";
});

const fakeToggle = jest.fn();

const MountedModal = (isOpen: boolean, isUpper?: boolean) => {
  return mount(
    <Modal isOpen={isOpen} isUpper={isUpper || false} toggleOpen={fakeToggle}>
      <div />
    </Modal>
  );
};

describe("<ModalInner />", () => {
  it("scroll isn't enabled if ref is null", () => {
    const useRefSpy = jest.spyOn(React, "useRef").mockImplementation(() =>
      Object.defineProperty({}, "current", {
        get: () => null,
        set: () => {},
      })
    );
    const tree = mount(
      <ModalInner size="lg" isUpper toggleOpen={fakeToggle} />
    );
    tree.setProps({ isUpper: false });
    tree.setProps({ isUpper: true });
    tree.setProps({ isUpper: false });
    expect(useRefSpy).toHaveBeenCalled();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is appended to MountModal container", () => {
    const tree = MountedModal(true);
    expect(tree.find("div").at(0).hasClass("modal-open")).toBe(true);
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    MountedModal(true);
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is not removed from body node after hidden modal is unmounted", () => {
    document.body.classList.add("modal-open");
    const tree = MountedModal(false);
    tree.unmount();
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const tree = MountedModal(true);
    act(() => {
      tree.unmount();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is not removed from body when hidden modal is updated", () => {
    document.body.classList.toggle("modal-open", true);
    const tree = MountedModal(false);
    expect(document.body.className.split(" ")).toContain("modal-open");
    // force update
    tree.setProps({ style: {} });
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body when visible modal is updated to be hidden", () => {
    document.body.classList.toggle("modal-open", true);
    const isOpen = true;
    const tree = MountedModal(isOpen);
    expect(document.body.className.split(" ")).toContain("modal-open");

    tree.setProps({ isOpen: false });
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is not removed if Modal isUpper=true and is unmounted", () => {
    const tree = MountedModal(true, true);
    expect(document.body.className.split(" ")).toContain("modal-open");

    act(() => {
      tree.unmount();
    });
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is not removed if Modal isUpper=true and is updated to be hidden", () => {
    const tree = MountedModal(true, true);
    expect(document.body.className.split(" ")).toContain("modal-open");

    tree.setProps({ isOpen: false });
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("passes extra props down to the CSSTransition animation component", () => {
    const onExited = jest.fn();
    const tree = mount(
      <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
        <div />
      </Modal>
    );
    const mountModal = tree.find("CSSTransition").at(0);
    expect((mountModal.props() as any).onExited).toBe(onExited);
  });

  it("toggleOpen is called after pressing 'esc'", () => {
    MountedModal(true);
    PressKey("Escape", 27);
    expect(fakeToggle).toHaveBeenCalled();
  });
});

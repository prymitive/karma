import React from "react";
import { act } from "react";

import { render } from "@testing-library/react";

import { PressKey } from "__fixtures__/PressKey";
import {
  MockThemeContext,
  MockThemeContextWithoutAnimations,
} from "__fixtures__/Theme";
import { ThemeContext } from "Components/Theme";
import { Modal, ModalInner } from ".";

beforeEach(() => {
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  document.body.className = "";
  document.documentElement.className = "";
});

const fakeToggle = jest.fn();

const renderModal = (isOpen: boolean, isUpper?: boolean) => {
  return render(
    <Modal isOpen={isOpen} isUpper={isUpper || false} toggleOpen={fakeToggle}>
      <div data-testid="modal-child" />
    </Modal>,
  );
};

describe("<ModalInner />", () => {
  it("'modal-open' class is appended to MountModal container", () => {
    renderModal(true);
    expect(document.body.querySelector("div.modal-open")).toBeInTheDocument();
  });

  it("'modal-open' class is appended to body node when modal is visible", () => {
    renderModal(true);
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is not removed from body node after hidden modal is unmounted", () => {
    document.body.classList.add("modal-open");
    const { unmount } = renderModal(false);
    unmount();
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body node after modal is unmounted", () => {
    const { unmount } = renderModal(true);
    act(() => {
      unmount();
    });
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is not removed from body when hidden modal is updated", () => {
    document.body.classList.toggle("modal-open", true);
    const { rerender } = renderModal(false);
    expect(document.body.className.split(" ")).toContain("modal-open");
    rerender(
      <Modal isOpen={false} isUpper={false} toggleOpen={fakeToggle}>
        <div data-testid="modal-child" />
      </Modal>,
    );
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is removed from body when visible modal is updated to be hidden", () => {
    document.body.classList.toggle("modal-open", true);
    const { rerender } = renderModal(true);
    expect(document.body.className.split(" ")).toContain("modal-open");

    rerender(
      <Modal isOpen={false} isUpper={false} toggleOpen={fakeToggle}>
        <div data-testid="modal-child" />
      </Modal>,
    );
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });

  it("'modal-open' class is not removed if Modal isUpper=true and is unmounted", () => {
    const { unmount } = renderModal(true, true);
    expect(document.body.className.split(" ")).toContain("modal-open");

    act(() => {
      unmount();
    });
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("'modal-open' class is not removed if Modal isUpper=true and is updated to be hidden", () => {
    const { rerender } = renderModal(true, true);
    expect(document.body.className.split(" ")).toContain("modal-open");

    rerender(
      <Modal isOpen={false} isUpper={true} toggleOpen={fakeToggle}>
        <div data-testid="modal-child" />
      </Modal>,
    );
    expect(document.body.className.split(" ")).toContain("modal-open");
  });

  it("renders modal when onExited callback is passed", () => {
    const onExited = jest.fn();
    render(
      <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
        <div />
      </Modal>,
    );
    expect(document.body.querySelector(".modal")).toBeInTheDocument();
  });

  it("calls onExited when modal is updated to be hidden", () => {
    const onExited = jest.fn();
    const { rerender } = render(
      <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
        <div />
      </Modal>,
    );
    expect(onExited).not.toHaveBeenCalled();

    rerender(
      <Modal isOpen={false} toggleOpen={fakeToggle} onExited={onExited}>
        <div />
      </Modal>,
    );
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it("doesn't call onExited while modal stays open", () => {
    const onExited = jest.fn();
    const { rerender } = render(
      <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
        <div />
      </Modal>,
    );
    rerender(
      <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
        <div />
      </Modal>,
    );
    expect(onExited).not.toHaveBeenCalled();
  });

  it("renders modal when animations are enabled", () => {
    const onExited = jest.fn();
    render(
      <ThemeContext value={MockThemeContext}>
        <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    expect(document.body.querySelector(".modal")).toBeInTheDocument();
  });

  it("renders modal when animations are disabled", () => {
    const onExited = jest.fn();
    render(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    expect(document.body.querySelector(".modal")).toBeInTheDocument();
  });

  it("toggles the 'modal-open' class on the document element", () => {
    const { unmount } = renderModal(true);
    expect(document.documentElement.className.split(" ")).toContain(
      "modal-open",
    );

    act(() => {
      unmount();
    });
    expect(document.documentElement.className.split(" ")).not.toContain(
      "modal-open",
    );
  });

  it("toggleOpen is called after pressing 'esc'", () => {
    renderModal(true);
    PressKey("Escape", 27);
    expect(fakeToggle).toHaveBeenCalled();
  });

  it("scroll isn't enabled if ref is null", () => {
    const useRefSpy = jest.spyOn(React, "useRef").mockImplementation(() =>
      Object.defineProperty({} as { current: unknown }, "current", {
        get: () => null,
        set: () => {},
      }),
    );
    const { rerender } = render(
      <ModalInner size="modal-lg" isUpper toggleOpen={fakeToggle}>
        <div>test</div>
      </ModalInner>,
    );
    rerender(
      <ModalInner size="modal-lg" isUpper={false} toggleOpen={fakeToggle}>
        <div>test</div>
      </ModalInner>,
    );
    rerender(
      <ModalInner size="modal-lg" isUpper={true} toggleOpen={fakeToggle}>
        <div>test</div>
      </ModalInner>,
    );
    rerender(
      <ModalInner size="modal-lg" isUpper={false} toggleOpen={fakeToggle}>
        <div>test</div>
      </ModalInner>,
    );
    expect(useRefSpy).toHaveBeenCalled();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

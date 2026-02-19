import React from "react";
import { act } from "react-dom/test-utils";

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
    expect(document.body.className.split(" ")).toContain("modal-open");
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

  it("passes extra props down to the CSSTransition animation component", () => {
    const onExited = jest.fn();
    render(
      <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
        <div />
      </Modal>,
    );
    expect(document.body.querySelector(".modal")).toBeInTheDocument();
  });

  it("uses components-animation-modal class when animations are enabled", () => {
    const onExited = jest.fn();
    render(
      <ThemeContext.Provider value={MockThemeContext}>
        <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
          <div />
        </Modal>
      </ThemeContext.Provider>,
    );
    expect(document.body.querySelector(".modal")).toBeInTheDocument();
  });

  it("doesn't use components-animation-modal class when animations are disabled", () => {
    const onExited = jest.fn();
    render(
      <ThemeContext.Provider value={MockThemeContextWithoutAnimations}>
        <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
          <div />
        </Modal>
      </ThemeContext.Provider>,
    );
    expect(document.body.querySelector(".modal")).toBeInTheDocument();
  });

  it("toggleOpen is called after pressing 'esc'", () => {
    renderModal(true);
    PressKey("Escape", 27);
    expect(fakeToggle).toHaveBeenCalled();
  });

  it("scroll isn't enabled if ref is null", () => {
    const useRefSpy = jest.spyOn(React, "useRef").mockImplementation(() =>
      Object.defineProperty({} as any, "current", {
        get: () => null,
        set: () => {},
      }),
    );
    const { rerender } = render(
      <ModalInner size="modal-lg" isUpper toggleOpen={fakeToggle} />,
    );
    rerender(
      <ModalInner size="modal-lg" isUpper={false} toggleOpen={fakeToggle} />,
    );
    rerender(
      <ModalInner size="modal-lg" isUpper={true} toggleOpen={fakeToggle} />,
    );
    rerender(
      <ModalInner size="modal-lg" isUpper={false} toggleOpen={fakeToggle} />,
    );
    expect(useRefSpy).toHaveBeenCalled();
    expect(document.body.className.split(" ")).not.toContain("modal-open");
  });
});

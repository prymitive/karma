import React from "react";
import { act, useEffect } from "react";

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
    // The modal stays mounted while the exit animation runs.
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
    jest.useFakeTimers();
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
    expect(onExited).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("unmounts at once and calls onExited when animations are disabled", () => {
    const onExited = jest.fn();
    const { rerender } = render(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <Modal isOpen={true} toggleOpen={fakeToggle} onExited={onExited}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    expect(document.querySelector(".modal")).toBeInTheDocument();

    rerender(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <Modal isOpen={false} toggleOpen={fakeToggle} onExited={onExited}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    expect(document.querySelector(".modal")).not.toBeInTheDocument();
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

  it("renders the dialog with the enter animation class when open and animated", () => {
    render(
      <ThemeContext value={MockThemeContext}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    expect(
      document.querySelector(".components-animation-modal-enter .modal-dialog"),
    ).toBeInTheDocument();
  });

  it("keeps the enter class applied while the animations setting is toggled", () => {
    const { rerender } = render(
      <ThemeContext value={MockThemeContext}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    rerender(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    // Removing and re-applying the class would replay the animation.
    expect(
      document.querySelector(".components-animation-modal-enter .modal-dialog"),
    ).toBeInTheDocument();
  });

  it("does not add the enter class when animations are enabled after mount", () => {
    const { rerender } = render(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    rerender(
      <ThemeContext value={MockThemeContext}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    expect(
      document.querySelector(".components-animation-modal-enter .modal-dialog"),
    ).not.toBeInTheDocument();
  });

  it("keeps the modal mounted with the exit class until the exit animation is done", () => {
    jest.useFakeTimers();
    const { rerender } = render(
      <ThemeContext value={MockThemeContext}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <div />
        </Modal>
      </ThemeContext>,
    );

    rerender(
      <ThemeContext value={MockThemeContext}>
        <Modal isOpen={false} toggleOpen={fakeToggle}>
          <div />
        </Modal>
      </ThemeContext>,
    );
    expect(document.querySelector(".modal")).toBeInTheDocument();
    expect(
      document.querySelector(".components-animation-modal-exit .modal-dialog"),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(document.querySelector(".modal")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("does not remount children when the animations setting changes", () => {
    let mounts = 0;
    const ChildWithState: React.FC = () => {
      useEffect(() => {
        mounts++;
      }, []);
      return <div data-testid="modal-child" />;
    };

    const { rerender } = render(
      <ThemeContext value={MockThemeContext}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <ChildWithState />
        </Modal>
      </ThemeContext>,
    );
    const mountsAfterOpen = mounts;
    expect(mountsAfterOpen).toBe(1);

    rerender(
      <ThemeContext value={MockThemeContextWithoutAnimations}>
        <Modal isOpen={true} toggleOpen={fakeToggle}>
          <ChildWithState />
        </Modal>
      </ThemeContext>,
    );
    expect(mounts).toBe(mountsAfterOpen);
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

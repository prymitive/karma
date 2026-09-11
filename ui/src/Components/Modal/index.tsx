import React, {
  use,
  FC,
  useEffect,
  useRef,
  useDeferredValue,
  ViewTransition,
} from "react";
import ReactDOM from "react-dom";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import { useHotkeys } from "react-hotkeys-hook";

import { ThemeContext } from "Components/Theme";

const ModalInner: FC<{
  size: "modal-lg" | "modal-xl";
  isUpper: boolean;
  toggleOpen: () => void;
  children: React.ReactNode;
}> = ({ size, isUpper, toggleOpen, children }) => {
  // needed for tests to spy on useRef
  const ref = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current !== null) {
      document.body.classList.add("modal-open");
      disableBodyScroll(ref.current, { reserveScrollBarGap: true });

      const modal = ref.current;
      return () => {
        if (!isUpper) document.body.classList.remove("modal-open");
        enableBodyScroll(modal);
      };
    }
  }, [isUpper]);

  useHotkeys("esc", toggleOpen);

  return (
    <div className="modal-open">
      <div ref={ref} className="modal d-block" role="dialog">
        <div
          className={`modal-dialog ${size} ${
            isUpper ? "modal-upper shadow" : ""
          }`}
          role="document"
        >
          <div className="modal-content">{children}</div>
        </div>
      </div>
    </div>
  );
};

const Modal: FC<{
  size?: "modal-lg" | "modal-xl";
  isOpen: boolean;
  isUpper?: boolean;
  toggleOpen: () => void;
  onExited?: () => void;
  children: React.ReactNode;
}> = ({
  size = "modal-lg",
  isOpen,
  isUpper = false,
  toggleOpen,
  onExited,
  children,
}) => {
  const context = use(ThemeContext);
  const isAnimated = context.animations.duration !== 0;
  // Store-driven open state renders urgently, deferring it makes the
  // modal mount and unmount render inside a Transition so it animates.
  const deferredIsOpen = useDeferredValue(isOpen);

  // The modal DOM is removed at once when closing (only the snapshot
  // animates), so onExited fires on close.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !deferredIsOpen) onExited?.();
    wasOpenRef.current = deferredIsOpen;
  }, [deferredIsOpen, onExited]);

  return ReactDOM.createPortal(
    <>
      {deferredIsOpen ? (
        isAnimated ? (
          <ViewTransition
            default="none"
            enter="components-animation-modal"
            exit="components-animation-modal"
          >
            <ModalInner size={size} isUpper={isUpper} toggleOpen={toggleOpen}>
              {children}
            </ModalInner>
          </ViewTransition>
        ) : (
          <ModalInner size={size} isUpper={isUpper} toggleOpen={toggleOpen}>
            {children}
          </ModalInner>
        )
      ) : null}
      {deferredIsOpen && !isUpper ? (
        <div className="modal-backdrop d-block" />
      ) : null}
    </>,
    document.body,
  );
};

export { Modal, ModalInner };

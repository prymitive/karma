import React, { use, FC, useEffect, useState, useEffectEvent } from "react";
import ReactDOM from "react-dom";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import { useHotkeys } from "react-hotkeys-hook";

import { ThemeContext } from "Components/Theme";

const ModalInner: FC<{
  size: "modal-lg" | "modal-xl";
  isUpper: boolean;
  toggleOpen: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ size, isUpper, toggleOpen, className, children }) => {
  // needed for tests to spy on useRef
  const ref = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current !== null) {
      document.body.classList.add("modal-open");
      document.documentElement.classList.add("modal-open");
      disableBodyScroll(ref.current, { reserveScrollBarGap: true });

      const modal = ref.current;
      return () => {
        if (!isUpper) {
          document.body.classList.remove("modal-open");
          document.documentElement.classList.remove("modal-open");
        }
        enableBodyScroll(modal);
      };
    }
  }, [isUpper]);

  useHotkeys("esc", toggleOpen);

  return (
    <div className={`modal-open ${className ? className : ""}`}>
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

// Must be the same as the exit animation duration in _MountModal.scss.
const modalExitDuration = 200;

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

  // The modal DOM is kept mounted while the exit animation runs.
  const [isVisible, setIsVisible] = useState<boolean>(isOpen);

  const callOnExited = useEffectEvent(() => {
    onExited?.();
  });

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      return;
    }
    if (!isVisible) return;

    if (!isAnimated) {
      setIsVisible(false);
      callOnExited();
      return;
    }
    const timer = window.setTimeout(() => {
      setIsVisible(false);
      callOnExited();
    }, modalExitDuration);
    return () => window.clearTimeout(timer);
  }, [isOpen, isVisible, isAnimated, callOnExited]);

  // The dialog animates through CSS, the classes carry the keyframes.
  const dialogClassName = !isOpen
    ? "components-animation-modal-exit"
    : isAnimated
      ? "components-animation-modal-enter"
      : "";

  return (
    <>
      {isVisible
        ? ReactDOM.createPortal(
            <ModalInner
              size={size}
              isUpper={isUpper}
              toggleOpen={toggleOpen}
              className={dialogClassName}
            >
              {children}
            </ModalInner>,
            document.body,
          )
        : null}
      {isVisible && !isUpper
        ? ReactDOM.createPortal(
            <div
              className={`modal-backdrop d-block ${
                !isOpen && isAnimated
                  ? "components-animation-backdrop-exit"
                  : ""
              }`}
            />,
            document.body,
          )
        : null}
    </>
  );
};

export { Modal, ModalInner };

import React, { FC, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

import { CSSTransition } from "react-transition-group";

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
  const context = React.useContext(ThemeContext);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  return ReactDOM.createPortal(
    <>
      <CSSTransition
        in={isOpen}
        classNames={
          context.animations.duration ? "components-animation-modal" : ""
        }
        timeout={context.animations.duration ? 300 : 0}
        onExited={onExited}
        enter
        exit
        unmountOnExit
        nodeRef={modalRef}
      >
        <div ref={modalRef}>
          <ModalInner size={size} isUpper={isUpper} toggleOpen={toggleOpen}>
            {children}
          </ModalInner>
        </div>
      </CSSTransition>
      <CSSTransition
        in={isOpen && !isUpper}
        classNames="components-animation-backdrop"
        timeout={context.animations.duration ? 300 : 0}
        enter
        exit
        unmountOnExit
        nodeRef={backdropRef}
      >
        <div ref={backdropRef} className="modal-backdrop d-block" />
      </CSSTransition>
    </>,
    document.body,
  );
};

export { Modal, ModalInner };

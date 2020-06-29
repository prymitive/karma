import React, { FC, useEffect } from "react";
import ReactDOM from "react-dom";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import { useHotkeys } from "react-hotkeys-hook";

import {
  MountModal,
  MountModalBackdrop,
} from "Components/Animations/MountModal";

const ModalInner: FC<{
  size: "lg" | "xl";
  isUpper: boolean;
  toggleOpen: () => void;
}> = ({ size, isUpper, toggleOpen, children }) => {
  // needed for tests to spy on useRef
  const ref = React.useRef(null as HTMLDivElement | null);

  useEffect(() => {
    if (ref.current !== null) {
      document.body.classList.add("modal-open");
      disableBodyScroll(ref.current, { reserveScrollBarGap: true });

      let modal = ref.current;
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
          className={`modal-dialog modal-${size} ${
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
  size?: "lg" | "xl";
  isOpen: boolean;
  isUpper?: boolean;
  toggleOpen: () => void;
}> = ({
  size = "lg",
  isOpen,
  isUpper = false,
  toggleOpen,
  children,
  ...props
}) => {
  return ReactDOM.createPortal(
    <React.Fragment>
      <MountModal in={isOpen} unmountOnExit {...props}>
        <ModalInner size={size} isUpper={isUpper} toggleOpen={toggleOpen}>
          {children}
        </ModalInner>
      </MountModal>
      <MountModalBackdrop in={isOpen} unmountOnExit>
        <div className="modal-backdrop d-block" />
      </MountModalBackdrop>
    </React.Fragment>,
    document.body
  );
};

export { Modal, ModalInner };

import React, { useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import { useHotkeys } from "react-hotkeys-hook";

import {
  MountModal,
  MountModalBackdrop,
} from "Components/Animations/MountModal";

const ModalInner = ({ size, isUpper, toggleOpen, children }) => {
  const ref = useRef(null);

  useEffect(() => {
    document.body.classList.add("modal-open");
    disableBodyScroll(ref.current);

    let modal = ref.current;
    return () => {
      if (!isUpper) document.body.classList.remove("modal-open");
      enableBodyScroll(modal);
    };
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

const Modal = ({ size, isOpen, isUpper, toggleOpen, children, ...props }) => {
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
Modal.propTypes = {
  size: PropTypes.oneOf(["lg", "xl"]),
  isOpen: PropTypes.bool.isRequired,
  isUpper: PropTypes.bool,
  toggleOpen: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};
Modal.defaultProps = {
  size: "lg",
  isUpper: false,
};

export { Modal };

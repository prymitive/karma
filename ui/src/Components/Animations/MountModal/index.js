import React from "react";
import PropTypes from "prop-types";

import { CSSTransition } from "react-transition-group";

const MountModal = ({ children, duration, ...props }) => (
  <CSSTransition
    classNames="components-animation-modal"
    timeout={200}
    appear={true}
    enter={true}
    exit={true}
    {...props}
  >
    {children}
  </CSSTransition>
);
MountModal.propTypes = {
  children: PropTypes.node.isRequired,
};

const MountModalBackdrop = ({ children, duration, ...props }) => (
  <CSSTransition
    in={true}
    classNames="components-animation-backdrop"
    timeout={200}
    appear={true}
    enter={true}
    exit={true}
    {...props}
  >
    {children}
  </CSSTransition>
);
MountModalBackdrop.propTypes = {
  children: PropTypes.node.isRequired,
};

export { MountModal, MountModalBackdrop };

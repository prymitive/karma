import React from "react";
import PropTypes from "prop-types";

import { CSSTransition } from "react-transition-group";

const MountFade = ({ children, duration, ...props }) => (
  <CSSTransition
    classNames="components-animation-fade"
    timeout={300}
    appear={true}
    {...props}
  >
    {children}
  </CSSTransition>
);
MountFade.propTypes = {
  children: PropTypes.node.isRequired,
};

export { MountFade };

import React from "react";
import PropTypes from "prop-types";

import { CSSTransition } from "react-transition-group";

const NavBarSlide = ({ children, duration, ...props }) => (
  <CSSTransition
    classNames="components-animation-navbar"
    timeout={500}
    appear={false}
    enter={true}
    exit={true}
    {...props}
  >
    {children}
  </CSSTransition>
);
NavBarSlide.propTypes = {
  children: PropTypes.node.isRequired
};

export { NavBarSlide };

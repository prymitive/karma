import React, { FC, ReactNode } from "react";
import PropTypes from "prop-types";

import { CSSTransition } from "react-transition-group";

const DropdownSlide: FC<{
  children: ReactNode;
  duration: number;
}> = ({ children, duration, ...props }) => (
  <CSSTransition
    classNames="components-animation-slide"
    timeout={150}
    appear={true}
    exit={true}
    {...props}
  >
    {children}
  </CSSTransition>
);
DropdownSlide.propTypes = {
  children: PropTypes.node.isRequired,
};

export { DropdownSlide };

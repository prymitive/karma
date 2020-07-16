import React, { FC, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

const DropdownSlide: FC<{
  children: ReactNode;
  in?: boolean;
  unmountOnExit?: boolean;
}> = ({ children, ...props }) => (
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

export { DropdownSlide };

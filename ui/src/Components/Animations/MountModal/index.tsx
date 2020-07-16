import React, { FC, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

const MountModal: FC<{
  children: ReactNode;
  in: boolean;
  unmountOnExit?: boolean;
}> = ({ children, ...props }) => (
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

const MountModalBackdrop: FC<{
  children: ReactNode;
  in?: boolean;
  unmountOnExit?: boolean;
}> = ({ children, ...props }) => (
  <CSSTransition
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

export { MountModal, MountModalBackdrop };

import React, { FC, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import { ThemeContext } from "Components/Theme";

const DropdownSlide: FC<{
  children: ReactNode;
  in?: boolean;
  unmountOnExit?: boolean;
}> = ({ children, ...props }) => {
  const context = React.useContext(ThemeContext);

  return (
    <CSSTransition
      classNames="components-animation-slide"
      timeout={context.animations.duration ? 150 : 0}
      appear={true}
      exit={true}
      {...props}
    >
      {children}
    </CSSTransition>
  );
};

export { DropdownSlide };

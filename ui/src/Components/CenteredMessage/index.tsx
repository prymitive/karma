import React, { FC, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import { ThemeContext } from "Components/Theme";

const CenteredMessage: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const context = React.useContext(ThemeContext);
  return (
    <CSSTransition
      in={true}
      appear={true}
      classNames="components-animation-fade"
      timeout={context.animations.duration}
    >
      <h1
        className={`${
          className ? className : "display-1 text-placeholder"
        } screen-center`}
      >
        {children}
      </h1>
    </CSSTransition>
  );
};

export { CenteredMessage };

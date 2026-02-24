import React, { FC, useRef } from "react";

import { CSSTransition } from "react-transition-group";

import { ThemeContext } from "Components/Theme";

const DropdownSlide: FC<{
  children: React.ReactElement<{ ref?: React.Ref<HTMLDivElement> }>;
  in?: boolean;
  unmountOnExit?: boolean;
}> = ({ children, ...props }) => {
  const context = React.useContext(ThemeContext);
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <CSSTransition
      classNames="components-animation-slide"
      timeout={context.animations.duration ? 150 : 0}
      appear={true}
      exit={true}
      nodeRef={nodeRef}
      {...props}
    >
      {React.cloneElement(children, { ref: nodeRef })}
    </CSSTransition>
  );
};

export { DropdownSlide };

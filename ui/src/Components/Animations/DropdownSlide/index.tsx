import { FC, ReactElement } from "react";

import { MountTransition } from "Components/Animations/MountTransition";

const DropdownSlide: FC<{
  children: ReactElement;
  in: boolean;
}> = ({ children, in: inProp }) => (
  <MountTransition
    in={inProp}
    enter="components-animation-slide"
    exit="components-animation-slide"
  >
    {children}
  </MountTransition>
);

export { DropdownSlide };

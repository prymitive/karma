import { FC, ReactElement } from "react";

import { MountTransition } from "Components/Animations/MountTransition";

const DropdownSlide: FC<{
  children: ReactElement<{ className?: string }>;
  in: boolean;
}> = ({ children, in: inProp }) => (
  <MountTransition
    in={inProp}
    enter="components-animation-slide-enter"
    exit="components-animation-slide-exit"
  >
    {children}
  </MountTransition>
);

export { DropdownSlide };

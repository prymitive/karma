import React from "react";

import { MountFade } from "Components/Animations/MountFade";

const CenteredMessage = ({ children, className }) => (
  <h1
    className={`${
      className ? className : "display-1 text-placeholder"
    } screen-center`}
  >
    <MountFade in={true}>{children}</MountFade>
  </h1>
);

export { CenteredMessage };

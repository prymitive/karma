import React from "react";

import { Fade } from "react-reveal";

const CenteredMessage = ({ children, className }) => (
  <h1
    className={`${
      className ? className : "display-1 text-placeholder"
    } screen-center`}
  >
    <Fade in={true} duration={500}>
      {children}
    </Fade>
  </h1>
);

export { CenteredMessage };

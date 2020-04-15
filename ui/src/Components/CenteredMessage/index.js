import React from "react";

import { Fade } from "react-reveal";

import { ThemeContext } from "Components/Theme";

const CenteredMessage = ({ children, className }) => {
  const theme = React.useContext(ThemeContext);
  return (
    <h1
      className={`${
        className ? className : "display-1 text-placeholder"
      } screen-center`}
    >
      <Fade in={theme.animations.in} duration={theme.animations.duration}>
        {children}
      </Fade>
    </h1>
  );
};

export { CenteredMessage };

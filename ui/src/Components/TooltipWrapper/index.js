import React from "react";
import PropTypes from "prop-types";

import { Tooltip } from "react-tippy";

import "react-tippy/dist/tippy.css";

const TooltipWrapper = ({ children, ...props }) => (
  <Tooltip delay={[1000, 100]} size="small" touchHold={true} {...props}>
    {children}
  </Tooltip>
);
Tooltip.propTypes = {
  children: PropTypes.node.isRequired
};

export { TooltipWrapper };

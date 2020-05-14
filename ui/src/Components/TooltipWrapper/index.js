import React from "react";
import PropTypes from "prop-types";

import TooltipTrigger from "react-popper-tooltip";

const Tooltip = ({ html, tooltip, children, className }) => (
  <TooltipTrigger
    trigger="hover"
    placement="top"
    delayShow={1000}
    delayHide={100}
    tooltip={({
      arrowRef,
      tooltipRef,
      getArrowProps,
      getTooltipProps,
      placement,
    }) => (
      <div
        {...getTooltipProps({
          ref: tooltipRef,
          className: "tooltip show tooltip-inner",
          style: { transition: "opacity 0.2s" },
        })}
      >
        {tooltip}
      </div>
    )}
  >
    {({ getTriggerProps, triggerRef }) => (
      <div
        {...getTriggerProps({
          ref: triggerRef,
        })}
        style={{ display: "inline-block", maxWidth: "100%" }}
        className={`${className ? className : ""} tooltip-trigger`}
      >
        {children}
      </div>
    )}
  </TooltipTrigger>
);

const TooltipWrapper = ({ title, children, className }) => (
  <Tooltip tooltip={title} className={className}>
    {children}
  </Tooltip>
);
TooltipWrapper.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export { TooltipWrapper };

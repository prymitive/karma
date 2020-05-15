import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";

import { usePopper } from "react-popper";

import { useSupportsTouch } from "Hooks/useSupportsTouch";

const TooltipWrapper = ({ title, children, className }) => {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "top",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          boundariesElement: "viewport",
        },
      },
    ],
  });

  const supportsTouch = useSupportsTouch();
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [wasClicked, setWasClicked] = useState(false);

  const showTooltip = useCallback(() => setIsHovering(true), []);
  const hideTooltip = useCallback(() => setIsHovering(false), []);
  const handleClick = useCallback(() => setWasClicked(true), []);

  useEffect(() => {
    let timerShow;
    let timerHide;

    if (!isHovering) {
      if (isVisible) {
        clearTimeout(timerShow);
        timerHide = setTimeout(() => setIsVisible(false), 100);
      }
      setWasClicked(false);
    } else if (wasClicked) {
      clearTimeout(timerShow);
      clearTimeout(timerHide);
      setIsVisible(false);
    } else if (!isVisible && isHovering) {
      clearTimeout(timerHide);
      timerShow = setTimeout(() => setIsVisible(true), 1000);
    }
    return () => {
      clearTimeout(timerShow);
      clearTimeout(timerHide);
    };
  }, [isHovering, isVisible, wasClicked]);

  return (
    <React.Fragment>
      <div
        onClick={handleClick}
        onMouseOver={supportsTouch ? null : showTooltip}
        onMouseLeave={supportsTouch ? null : hideTooltip}
        onTouchStart={supportsTouch ? showTooltip : null}
        onTouchCancel={supportsTouch ? hideTooltip : null}
        onTouchEnd={supportsTouch ? hideTooltip : null}
        ref={setReferenceElement}
        style={{ display: "inline-block", maxWidth: "100%" }}
        className={`${className ? className : ""} tooltip-trigger`}
      >
        {children}
      </div>
      {isVisible
        ? createPortal(
            <div
              className="tooltip show tooltip-inner"
              ref={setPopperElement}
              style={{
                willChange: "opacity",
                transition: "opacity 0.2s",
                ...styles.popper,
              }}
              {...attributes.popper}
            >
              {title}
            </div>,
            document.body
          )
        : null}
    </React.Fragment>
  );
};
TooltipWrapper.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export { TooltipWrapper };

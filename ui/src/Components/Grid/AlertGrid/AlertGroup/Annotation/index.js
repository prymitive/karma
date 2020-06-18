import React, { useEffect, useRef, useState, memo } from "react";
import PropTypes from "prop-types";

import Linkify from "react-linkify";

import { CSSTransition } from "react-transition-group";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faSearchPlus } from "@fortawesome/free-solid-svg-icons/faSearchPlus";
import { faSearchMinus } from "@fortawesome/free-solid-svg-icons/faSearchMinus";

import { TooltipWrapper } from "Components/TooltipWrapper";
import { useFlashTransition } from "Hooks/useFlashTransition";

const RenderNonLinkAnnotation = memo(
  ({ name, value, visible, afterUpdate }) => {
    const mountRef = useRef(false);

    const [isVisible, setIsVisible] = useState(visible);

    useEffect(() => {
      if (mountRef.current) {
        afterUpdate();
      } else {
        mountRef.current = true;
      }
    });

    const { ref, props } = useFlashTransition(value);

    const className =
      "mb-1 p-1 bg-light d-inline-block rounded components-grid-annotation text-break mw-100";

    return (
      <TooltipWrapper title="Toggle annotation value">
        <div
          className={`${className}${isVisible ? "" : " cursor-pointer"}`}
          onClick={isVisible ? undefined : () => setIsVisible(!isVisible)}
        >
          {isVisible ? (
            <React.Fragment>
              <span
                onClick={() => setIsVisible(false)}
                className="cursor-pointer"
              >
                <FontAwesomeIcon icon={faSearchMinus} className="mr-1" />
                <span className="text-muted">{name}: </span>
              </span>
              <Linkify
                properties={{
                  target: "_blank",
                  rel: "noopener noreferrer",
                }}
              >
                <CSSTransition {...props}>
                  <span ref={ref}>{value}</span>
                </CSSTransition>
              </Linkify>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <FontAwesomeIcon icon={faSearchPlus} className="mr-1" />
              {name}
            </React.Fragment>
          )}
        </div>
      </TooltipWrapper>
    );
  }
);
RenderNonLinkAnnotation.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  visible: PropTypes.bool.isRequired,
  afterUpdate: PropTypes.func.isRequired,
};

const RenderLinkAnnotation = ({ name, value }) => {
  return (
    <a
      key={name}
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="components-label components-label-with-hover badge components-grid-annotation-link"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> {name}
    </a>
  );
};
RenderLinkAnnotation.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

export { RenderNonLinkAnnotation, RenderLinkAnnotation };

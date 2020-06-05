import React, { useEffect, useRef, useState, memo } from "react";
import PropTypes from "prop-types";

import Linkify from "react-linkify";

import Flash from "react-reveal/Flash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faSearchPlus } from "@fortawesome/free-solid-svg-icons/faSearchPlus";
import { faSearchMinus } from "@fortawesome/free-solid-svg-icons/faSearchMinus";

import { TooltipWrapper } from "Components/TooltipWrapper";

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

    const className =
      "mb-1 p-1 bg-light d-inline-block rounded components-grid-annotation text-break mw-100";

    if (!isVisible) {
      return (
        <TooltipWrapper title="Click to show annotation value">
          <div
            className={`${className} cursor-pointer`}
            onClick={() => setIsVisible(!isVisible)}
          >
            <FontAwesomeIcon icon={faSearchPlus} className="mr-1" />
            {name}
          </div>
        </TooltipWrapper>
      );
    }

    return (
      <TooltipWrapper title="Click the icon to hide annotation value">
        <div key={name} className={className}>
          <span onClick={() => setIsVisible(false)} className="cursor-pointer">
            <FontAwesomeIcon icon={faSearchMinus} className="mr-1" />
            <span className="text-muted">{name}: </span>
          </span>
          <Linkify
            properties={{
              target: "_blank",
              rel: "noopener noreferrer",
            }}
          >
            <Flash spy={value}>
              <span>{value}</span>
            </Flash>
          </Linkify>
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

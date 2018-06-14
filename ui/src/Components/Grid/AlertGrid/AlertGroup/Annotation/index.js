import React from "react";
import PropTypes from "prop-types";

import Linkify from "react-linkify";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";

const RenderNonLinkAnnotation = ({ name, value }) => {
  return (
    <div key={name} className="p-1 mr-1">
      <span className="text-muted">{name}: </span>
      <Linkify>{value}</Linkify>
    </div>
  );
};
RenderNonLinkAnnotation.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired
};

const RenderLinkAnnotation = ({ name, value }) => {
  return (
    <a
      key={name}
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="text-nowrap text-truncate badge badge-secondary mr-1"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> {name}
    </a>
  );
};
RenderLinkAnnotation.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired
};

export { RenderNonLinkAnnotation, RenderLinkAnnotation };

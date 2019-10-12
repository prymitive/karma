import React from "react";
import PropTypes from "prop-types";

import Truncate from "react-truncate";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";

import { APISilence } from "Models/API";

const SilenceComment = ({ silence, collapsed, afterUpdate }) => {
  const comment = (
    <Truncate className="font-italic" lines={collapsed ? 2 : false}>
      {silence.comment}
    </Truncate>
  );
  if (silence.jiraURL) {
    return (
      <a href={silence.jiraURL} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon className="mr-2" icon={faExternalLinkAlt} />
        {comment}
      </a>
    );
  }
  return <React.Fragment>{comment}</React.Fragment>;
};
SilenceComment.propTypes = {
  silence: APISilence.isRequired,
  collapsed: PropTypes.bool.isRequired
};

export { SilenceComment };

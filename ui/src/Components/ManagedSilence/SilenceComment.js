import React from "react";
import PropTypes from "prop-types";

import Truncate from "react-truncate";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APISilence } from "Models/API";
import { SilenceProgress } from "./SilenceProgress";

const SilenceComment = ({ silence, collapsed, afterUpdate }) => {
  const commentBody = (
    <Truncate className="font-italic" lines={collapsed ? 2 : false}>
      {silence.comment}
    </Truncate>
  );
  const comment = silence.jiraURL ? (
    <a href={silence.jiraURL} target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon className="mr-2" icon={faExternalLinkAlt} />
      {commentBody}
    </a>
  ) : (
    commentBody
  );

  return (
    <div className="d-flex flex-row">
      <div className="flex-shrink-0 flex-grow-0  mr-2">
        <FontAwesomeIcon icon={faBellSlash} className="text-muted" />
      </div>
      <div className="flex-shrink-1 flex-grow-1">
        {comment}
        <span className="blockquote-footer pt-1">
          <cite className="components-grid-alertgroup-silences mr-2">
            {silence.createdBy}
          </cite>
          {collapsed ? <SilenceProgress silence={silence} /> : null}
        </span>
      </div>
    </div>
  );
};
SilenceComment.propTypes = {
  silence: APISilence.isRequired,
  collapsed: PropTypes.bool.isRequired
};

export { SilenceComment };

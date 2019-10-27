import React from "react";
import PropTypes from "prop-types";

import Truncate from "react-truncate";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APISilence } from "Models/API";
import { SilenceProgress } from "./SilenceProgress";

const SilenceComment = ({
  silence,
  collapsed,
  collapseToggle,
  afterUpdate
}) => {
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
    <React.Fragment>
      <div className="d-flex flex-row">
        <div className="flex-shrink-0 flex-grow-0  mr-2">
          <FontAwesomeIcon icon={faBellSlash} className="text-muted" />
        </div>
        <div className="flex-shrink-1 flex-grow-1">{comment}</div>
      </div>
      <div className="pt-1 d-flex flex-row justify-content-between">
        <div className="flex-shrink-1 flex-grow-1 components-managed-silence-cite">
          <span className="text-muted mr-2 font-italic">
            &mdash; {silence.createdBy}
          </span>
          {collapsed ? <SilenceProgress silence={silence} /> : null}
        </div>
        <div className="flex-grow-0 flex-shrink-0 mt-auto mb-0">
          <FontAwesomeIcon
            icon={collapsed ? faChevronUp : faChevronDown}
            className="ml-2 text-muted cursor-pointer"
            onClick={collapseToggle}
          />
        </div>
      </div>
    </React.Fragment>
  );
};
SilenceComment.propTypes = {
  silence: APISilence.isRequired,
  collapsed: PropTypes.bool.isRequired,
  collapseToggle: PropTypes.func.isRequired
};

export { SilenceComment };

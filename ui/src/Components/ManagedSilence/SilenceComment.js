import React from "react";
import PropTypes from "prop-types";

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
  const comment = silence.jiraURL ? (
    <a href={silence.jiraURL} target="_blank" rel="noopener noreferrer">
      <FontAwesomeIcon className="mr-2" icon={faExternalLinkAlt} />
      {silence.comment}
    </a>
  ) : (
    silence.comment
  );

  return (
    <React.Fragment>
      <div className="d-flex flex-row">
        <div className="flex-shrink-0 flex-grow-0 mr-2">
          <FontAwesomeIcon icon={faBellSlash} className="text-muted" />
        </div>
        <div className="flex-shrink-1 flex-grow-1 mw-1p">
          <div
            className={`font-italic ${
              collapsed ? "text-truncate overflow-hidden" : ""
            }`}
          >
            {comment}
          </div>
        </div>
      </div>
      <div className="pt-1 d-flex flex-row justify-content-between">
        <div className="flex-shrink-1 flex-grow-1 mw-1p components-managed-silence-cite">
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

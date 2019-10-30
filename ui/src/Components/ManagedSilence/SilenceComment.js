import React from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APISilence } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { SilenceProgress } from "./SilenceProgress";

const SilenceComment = ({
  silence,
  alertCount,
  alertCountAlwaysVisible,
  collapsed,
  collapseToggle,
  afterUpdate,
  alertStore
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
        <div className="flex-shrink-0 flex-grow-0">
          <FontAwesomeIcon icon={faBellSlash} className="text-muted" />
        </div>
        <div className="mx-2 flex-shrink-1 flex-grow-1 mw-1p">
          <div
            className={`font-italic ${
              collapsed ? "text-truncate overflow-hidden" : ""
            }`}
          >
            {comment}
          </div>
          <div className="components-managed-silence-cite">
            <span className="text-muted mr-2 font-italic">
              &mdash; {silence.createdBy}
            </span>
            {collapsed ? <SilenceProgress silence={silence} /> : null}
          </div>
        </div>
        <div className="flex-shrink-0 flex-grow-0">
          <div className="d-flex flex-column justify-content-between align-items-center">
            <FilteringCounterBadge
              alertStore={alertStore}
              name="@silence_id"
              value={silence.id}
              counter={alertCount}
              themed={false}
              alwaysVisible={alertCountAlwaysVisible}
            />
            <FontAwesomeIcon
              icon={collapsed ? faChevronUp : faChevronDown}
              className="mt-2 mr-1 text-muted cursor-pointer"
              onClick={collapseToggle}
            />
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};
SilenceComment.propTypes = {
  silence: APISilence.isRequired,
  alertCount: PropTypes.number.isRequired,
  collapsed: PropTypes.bool.isRequired,
  collapseToggle: PropTypes.func.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired
};

export { SilenceComment };

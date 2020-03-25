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
  cluster,
  silence,
  alertCount,
  alertCountAlwaysVisible,
  collapsed,
  collapseToggle,
  afterUpdate,
  alertStore,
}) => {
  const comment = silence.ticketURL ? (
    <a
      href={silence.ticketURL}
      target="_blank"
      rel="noopener noreferrer"
      className={
        collapsed
          ? "components-managed-silence-comment mw-100 text-truncate d-block"
          : "components-managed-silence-comment"
      }
    >
      <FontAwesomeIcon className="mr-2" icon={faExternalLinkAlt} />
      {silence.comment}
    </a>
  ) : (
    silence.comment
  );

  const alertmanagers = alertStore.data.upstreams.instances.filter(
    (u) => u.cluster === cluster
  );

  return (
    <React.Fragment>
      <div className="d-flex flex-row">
        <div className="flex-shrink-0 flex-grow-0">
          <FontAwesomeIcon
            icon={faBellSlash}
            className="components-managed-silence-icon text-muted"
          />
        </div>
        <div className="mx-2 flex-shrink-1 flex-grow-1 mw-1p">
          <div
            className={`font-italic components-managed-silence-comment ${
              collapsed ? "text-truncate overflow-hidden" : ""
            }`}
          >
            {comment}
          </div>
          <div className="components-managed-silence-cite mt-1">
            <span className="text-muted mr-2 font-italic">
              &mdash; {silence.createdBy}
            </span>
            {collapsed &&
              Object.keys(alertStore.data.upstreams.clusters).length > 1 &&
              alertmanagers.map((alertmanager) => (
                <span
                  key={alertmanager.name}
                  className="badge badge-secondary mx-1 align-text-bottom p-1"
                >
                  {alertmanager.name}
                </span>
              ))}
            {collapsed ? <SilenceProgress silence={silence} /> : null}
          </div>
        </div>
        <div className="flex-shrink-0 flex-grow-0">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center">
            <FilteringCounterBadge
              alertStore={alertStore}
              name="@silence_id"
              value={silence.id}
              counter={alertCount}
              themed={false}
              alwaysVisible={alertCountAlwaysVisible}
              defaultColor="primary"
            />
            <FontAwesomeIcon
              icon={collapsed ? faChevronUp : faChevronDown}
              className={`components-managed-silence-icon ${
                alertCount && alertCountAlwaysVisible && "my-sm-auto mt-2 mb-0"
              } ml-sm-2 ml-auto mr-sm-0 mr-1 text-muted cursor-pointer`}
              onClick={collapseToggle}
            />
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};
SilenceComment.propTypes = {
  cluster: PropTypes.string.isRequired,
  silence: APISilence.isRequired,
  alertCount: PropTypes.number.isRequired,
  collapsed: PropTypes.bool.isRequired,
  collapseToggle: PropTypes.func.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { SilenceComment };

import React, { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { ToggleIcon } from "Components/ToggleIcon";
import { SilenceProgress } from "./SilenceProgress";

const SilenceComment: FC<{
  cluster: string;
  silence: APISilenceT;
  alertCount: number;
  collapsed: boolean;
  collapseToggle: () => void;
  alertStore: AlertStore;
  alertCountAlwaysVisible: boolean;
}> = ({
  cluster,
  silence,
  alertCount,
  alertCountAlwaysVisible,
  collapsed,
  collapseToggle,
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
            Object.keys(alertStore.data.upstreams.clusters).length > 1 ? (
              <span className="badge badge-secondary mx-1 align-text-bottom p-1">
                {cluster}
              </span>
            ) : null}
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
              isAppend={false}
            />
            <ToggleIcon
              isOpen={!collapsed}
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

export { SilenceComment };

import { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import FilteringCounterBadge from "Components/Labels/FilteringCounterBadge";
import { ToggleIcon } from "Components/ToggleIcon";
import { SilenceProgress } from "./SilenceProgress";

const SilenceComment: FC<{
  cluster: string;
  silence: APISilenceT;
  alertCount: number;
  collapsed: boolean;
  collapseToggle: () => void;
  alertStore: AlertStore;
  alertCountAlwaysVisible?: boolean;
}> = ({
  cluster,
  silence,
  alertCount,
  alertCountAlwaysVisible,
  collapsed,
  collapseToggle,
  alertStore,
}) => {
  const comment = silence.comment.split(" ").map((w, i) =>
    silence.ticketURL && w === silence.ticketID ? (
      <a
        key={i}
        href={silence.ticketURL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon className="me-2" icon={faExternalLinkAlt} />
        {silence.ticketID}
      </a>
    ) : (
      " " + w
    )
  );

  return (
    <>
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
            {comment.map((w) => w)}
          </div>
          <div className="components-managed-silence-cite mt-1">
            <span className="text-muted me-2 font-italic">
              &mdash; {silence.createdBy}
            </span>
            {collapsed &&
            Object.keys(alertStore.data.upstreams.clusters).length > 1 ? (
              <span className="badge bg-secondary mx-1 align-text-bottom p-1">
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
            <span className="badge components-label with-click">
              <ToggleIcon
                isOpen={!collapsed}
                className="components-managed-silence-icon m-auto text-muted cursor-pointer"
                onClick={collapseToggle}
              />
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export { SilenceComment };

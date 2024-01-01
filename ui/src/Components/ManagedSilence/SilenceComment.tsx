import { Fragment, FC } from "react";

import { observer } from "mobx-react-lite";

import { parseISO } from "date-fns/parseISO";
import { differenceInSeconds } from "date-fns";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import type { APISilenceT } from "Models/APITypes";
import type { AlertStore } from "Stores/AlertStore";
import FilteringCounterBadge from "Components/Labels/FilteringCounterBadge";
import { ToggleIcon } from "Components/ToggleIcon";
import { DateFromNow } from "Components/DateFromNow";
import { StaticLabels } from "Common/Query";

const SilenceProgress: FC<{
  silence: APISilenceT;
}> = observer(({ silence }) => {
  const diff = differenceInSeconds(parseISO(silence.endsAt), new Date());
  if (diff <= 0) {
    return (
      <span className="badge bg-danger components-label">
        Expired <DateFromNow timestamp={silence.endsAt} />
      </span>
    );
  }
  return (
    <span
      className={`badge ${
        diff <= 300 ? "bg-warning" : "bg-light"
      } components-label`}
    >
      Expires <DateFromNow timestamp={silence.endsAt} />
    </span>
  );
});

const SilenceComment: FC<{
  cluster: string;
  silence: APISilenceT;
  alertCount: number;
  collapsed: boolean;
  collapseToggle: () => void;
  alertStore: AlertStore;
  alertCountAlwaysVisible?: boolean;
}> = observer(
  ({
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
        <Fragment key={i}>
          {i ? " " : null}
          <a href={silence.ticketURL} target="_blank" rel="noopener noreferrer">
            {silence.ticketID}
          </a>
        </Fragment>
      ) : (
        " " + w
      ),
    );

    return (
      <>
        <div className="d-flex flex-row">
          <div className="flex-shrink-0 flex-grow-0">
            <FontAwesomeIcon icon={faBellSlash} className="text-muted" />
          </div>
          <div className="mx-2 flex-shrink-1 flex-grow-1 mw-1p">
            <div
              className={`components-managed-silence-comment ${
                collapsed ? "text-truncate overflow-hidden" : ""
              }`}
            >
              {comment}
            </div>
            <div className="components-managed-silence-cite mt-1 d-flex flex-row">
              <span
                className={`text-muted text-truncate overflow-hidden ${
                  collapsed ? "me-2" : ""
                }`}
              >
                &mdash; {silence.createdBy}
              </span>
              {collapsed ? (
                <div className="d-flex flex-row justify-content-end flex-grow-1">
                  <SilenceProgress silence={silence} />
                  {Object.keys(alertStore.data.upstreams.clusters).length >
                  1 ? (
                    <span className="badge bg-secondary mx-1 components-label">
                      {cluster}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex-shrink-0 flex-grow-0">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center">
              <FilteringCounterBadge
                alertStore={alertStore}
                name={StaticLabels.SilencedBy}
                value={silence.id}
                counter={alertCount}
                themed={false}
                alwaysVisible={alertCountAlwaysVisible}
                defaultColor="bg-primary"
                isAppend={false}
              />
              <span className="badge components-label with-click">
                <ToggleIcon
                  isOpen={!collapsed}
                  className="m-auto text-muted cursor-pointer"
                  onClick={collapseToggle}
                />
              </span>
            </div>
          </div>
        </div>
      </>
    );
  },
);

export { SilenceComment, SilenceProgress };

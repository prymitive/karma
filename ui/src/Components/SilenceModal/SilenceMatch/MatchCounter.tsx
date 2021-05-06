import { FC } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { APIAlertsResponseT } from "Models/APITypes";
import { FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore, MatcherWithIDT } from "Stores/SilenceFormStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { useFetchGet } from "Hooks/useFetchGet";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const MatchCounter: FC<{
  silenceFormStore: SilenceFormStore;
  matcher: MatcherWithIDT;
}> = observer(({ silenceFormStore, matcher }) => {
  const filters = [MatcherToFilter(matcher)];
  if (silenceFormStore.data.alertmanagers.length) {
    filters.push(AlertManagersToFilter(silenceFormStore.data.alertmanagers));
  }

  const { response, error, isLoading, isRetrying } =
    useFetchGet<APIAlertsResponseT>(
      FormatBackendURI("alerts.json?") + FormatAlertsQ(filters)
    );

  return error ? (
    <TooltipWrapper
      title={`Failed to fetch alerts matching this label: ${error}`}
    >
      <FontAwesomeIcon className="text-danger" icon={faExclamationCircle} />
    </TooltipWrapper>
  ) : (
    <TooltipWrapper title="Number of alerts matching this label">
      <span
        className="badge bg-light rounded-pill d-block"
        style={{ fontSize: "85%", lineHeight: "1rem" }}
        data-am={silenceFormStore.data.alertmanagers.length}
      >
        {isLoading || response === null ? (
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            className={isRetrying ? "text-danger" : ""}
          />
        ) : (
          Math.max(response.totalAlerts, 0)
        )}
      </span>
    </TooltipWrapper>
  );
});

export { MatchCounter };

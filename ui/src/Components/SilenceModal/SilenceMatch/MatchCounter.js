import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceFormMatcher } from "Models/SilenceForm";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { useFetchGet } from "Hooks/useFetchGet";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const MatchCounter = ({ silenceFormStore, matcher }) => {
  const filters = [MatcherToFilter(matcher)];
  if (silenceFormStore.data.alertmanagers.length) {
    filters.push(AlertManagersToFilter(silenceFormStore.data.alertmanagers));
  }

  const { response, error, isLoading, isRetrying } = useFetchGet(
    FormatBackendURI("alerts.json?") + FormatAlertsQ(filters)
  );

  return useObserver(() =>
    error ? (
      <TooltipWrapper
        title={`Failed to fetch alerts matching this label: ${error}`}
      >
        <FontAwesomeIcon className="text-danger" icon={faExclamationCircle} />
      </TooltipWrapper>
    ) : (
      <TooltipWrapper title="Number of alerts matching this label">
        <span
          className="badge badge-light badge-pill d-block"
          style={{ fontSize: "85%", lineHeight: "1rem" }}
          data-am={silenceFormStore.data.alertmanagers.length}
        >
          {isLoading ? (
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
    )
  );
};
MatchCounter.propTypes = {
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  matcher: SilenceFormMatcher.isRequired,
};

export { MatchCounter };

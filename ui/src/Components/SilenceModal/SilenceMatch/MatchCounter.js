import React, { useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import throttle from "lodash/throttle";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceFormMatcher } from "Models/SilenceForm";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { FetchGet } from "Common/Fetch";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const MatchCounter = ({ silenceFormStore, matcher }) => {
  const matchedAlerts = useLocalStore(() => ({
    total: null,
    error: null,
    setTotal(value) {
      this.total = value;
    },
    setError(value) {
      this.error = value;
    },
  }));

  const onFetch = useCallback(
    throttle(() => {
      const filters = [MatcherToFilter(matcher)];
      if (silenceFormStore.data.alertmanagers.length) {
        filters.push(
          AlertManagersToFilter(silenceFormStore.data.alertmanagers)
        );
      }

      const alertsURI =
        FormatBackendURI("alerts.json?") + FormatAlertsQ(filters);

      FetchGet(alertsURI, {})
        .then((result) => {
          return result.json();
        })
        .then((result) => {
          matchedAlerts.setTotal(result.totalAlerts);
          matchedAlerts.setError(null);
        })
        .catch((err) => {
          console.trace(err);
          return matchedAlerts.setError(err.message);
        });
    }, 300),
    [matcher.name]
  );

  useEffect(() => {
    if (matcher.name === "" || matcher.values.length === 0) {
      matchedAlerts.setTotal(0);
      matchedAlerts.setError(null);
    } else {
      onFetch();
    }
  }, [matchedAlerts, matcher.name, matcher.values.length, onFetch]);

  return useObserver(() =>
    matchedAlerts.error !== null ? (
      <TooltipWrapper
        title={`Failed to fetch alerts matching this label: ${matchedAlerts.error}`}
      >
        <FontAwesomeIcon className="text-danger" icon={faExclamationCircle} />
      </TooltipWrapper>
    ) : (
      <TooltipWrapper title="Number of alerts matching this label">
        <span
          className="badge badge-light badge-pill d-block"
          style={{ fontSize: "85%", lineHeight: "1rem" }}
        >
          {matchedAlerts.total === null ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            matchedAlerts.total
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

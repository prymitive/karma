import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { throttle } from "lodash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceFormMatcher } from "Models/SilenceForm";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const MatchCounter = observer(
  class MatchCounter extends Component {
    static propTypes = {
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      matcher: SilenceFormMatcher.isRequired
    };

    matchedAlerts = observable(
      {
        total: null,
        error: null,
        fetch: null,
        setTotal(value) {
          this.total = value;
        },
        setError(value) {
          this.error = value;
        }
      },
      {
        setTotal: action,
        setError: action
      }
    );

    onFetch = throttle(() => {
      const { silenceFormStore, matcher } = this.props;

      const filters = [MatcherToFilter(matcher)];
      if (silenceFormStore.data.alertmanagers.length) {
        filters.push(
          AlertManagersToFilter(silenceFormStore.data.alertmanagers)
        );
      }

      const alertsURI =
        FormatBackendURI("alerts.json?") + FormatAlertsQ(filters);

      this.matchedAlerts.fetch = fetch(alertsURI, { credentials: "include" })
        .then(result => {
          return result.json();
        })
        .then(result => {
          this.matchedAlerts.setTotal(result.totalAlerts);
          this.matchedAlerts.setError(null);
        })
        .catch(err => {
          console.trace(err);
          return this.matchedAlerts.setError(err.message);
        });
    }, 300);

    onUpdateCounter = () => {
      const { matcher } = this.props;

      if (matcher.name === "" || matcher.values.length === 0) {
        this.matchedAlerts.setTotal(0);
        this.matchedAlerts.setError(null);
        return;
      }

      this.onFetch();
    };

    componentDidMount() {
      this.onUpdateCounter();
    }

    render() {
      if (this.matchedAlerts.error !== null) {
        return (
          <TooltipWrapper
            title={`Failed to fetch alerts matching this label: ${
              this.matchedAlerts.error
            }`}
          >
            <FontAwesomeIcon
              className="text-danger"
              icon={faExclamationCircle}
            />
          </TooltipWrapper>
        );
      }

      return (
        <TooltipWrapper title="Number of alerts matching this label">
          <span
            className="badge badge-light badge-pill"
            style={{ fontSize: "85%" }}
          >
            {this.matchedAlerts.total === null ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              this.matchedAlerts.total
            )}
          </span>
        </TooltipWrapper>
      );
    }
  }
);

export { MatchCounter };

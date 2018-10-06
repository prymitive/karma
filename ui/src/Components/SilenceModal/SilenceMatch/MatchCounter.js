import React, { Component } from "react";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { throttle } from "lodash";

import hash from "object-hash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { FormatQuery, QueryOperators } from "Common/Query";
import { FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormMatcher } from "Models/SilenceForm";

const MatchCounter = observer(
  class MatchCounter extends Component {
    static propTypes = {
      matcher: SilenceFormMatcher.isRequired
    };

    matchedAlerts = observable(
      {
        total: 0,
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
      const { matcher } = this.props;

      const filters = [];

      // append current matcher values as a filter
      const operator = matcher.isRegex
        ? QueryOperators.Regex
        : QueryOperators.Equal;
      const value =
        matcher.values.length > 1
          ? `(${matcher.values.map(v => v.value).join("|")})`
          : matcher.values[0].value;
      filters.push(
        FormatQuery(
          matcher.name,
          operator,
          matcher.isRegex ? `^${value}$` : value
        )
      );

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

    componentDidUpdate() {
      this.onUpdateCounter();
    }

    render() {
      const { matcher } = this.props;

      const matcherHash = hash({
        name: matcher.name,
        values: matcher.values,
        isRegex: matcher.isRegex
      });

      if (this.matchedAlerts.error !== null) {
        return (
          <FontAwesomeIcon className="text-danger" icon={faExclamationCircle} />
        );
      }

      return (
        <span
          className="badge badge-light badge-pill"
          style={{ fontSize: "85%" }}
          data-hash={matcherHash}
        >
          {this.matchedAlerts.total}
        </span>
      );
    }
  }
);

export { MatchCounter };

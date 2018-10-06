import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import hash from "object-hash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { AlertStore, FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { StaticLabel } from "Components/Labels/StaticLabel";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const FetchError = ({ message }) => (
  <div className="text-center">
    <h2 className="display-2 text-danger">
      <FontAwesomeIcon icon={faExclamationCircle} />
    </h2>
    <p className="lead text-muted">{message}</p>
  </div>
);
FetchError.propTypes = {
  message: PropTypes.node.isRequired
};

const Preview = ({ alertStore, labelsList }) => (
  <ul className="list-group list-group-flush px-2">
    {labelsList.map(labels => (
      <li key={hash(labels)} className="list-group-item px-2 pt-2 pb-1">
        {Object.entries(labels).map(([name, value]) => (
          <StaticLabel
            key={name}
            alertStore={alertStore}
            name={name}
            value={value}
          />
        ))}
      </li>
    ))}
  </ul>
);
Preview.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  labelsList: PropTypes.arrayOf(PropTypes.object).isRequired
};

const SilencePreview = observer(
  class SilencePreview extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    matchedAlerts = observable(
      {
        alertLabels: [],
        error: null,
        fetch: null,
        groupsToUniqueLabels(groups) {
          const alerts = {};
          for (const group of groups) {
            for (const alert of group.alerts) {
              const alertLabels = Object.assign(
                {},
                group.labels,
                group.shared.labels,
                alert.labels
              );
              const alertHash = hash(alertLabels);
              alerts[alertHash] = alertLabels;
            }
          }
          this.alertLabels = Object.values(alerts);
        },
        setError(value) {
          this.error = value;
        }
      },
      {
        groupsToUniqueLabels: action,
        setError: action
      }
    );

    onFetch = () => {
      const { silenceFormStore } = this.props;

      const filters = [
        ...silenceFormStore.data.matchers.map(m => MatcherToFilter(m)),
        AlertManagersToFilter(silenceFormStore.data.alertmanagers)
      ];

      const alertsURI =
        FormatBackendURI("alerts.json?") + FormatAlertsQ(filters);

      this.matchedAlerts.fetch = fetch(alertsURI, { credentials: "include" })
        .then(result => {
          return result.json();
        })
        .then(result => {
          this.matchedAlerts.groupsToUniqueLabels(Object.values(result.groups));
          this.matchedAlerts.setError(null);
        })
        .catch(err => {
          console.trace(err);
          return this.matchedAlerts.setError(
            `Request failed with: ${err.message}`
          );
        });
    };

    componentDidMount() {
      this.onFetch();
    }

    render() {
      const { alertStore, silenceFormStore } = this.props;

      return (
        <React.Fragment>
          <div className="mb-2">
            {this.matchedAlerts.error !== null ? (
              <FetchError message={this.matchedAlerts.error} />
            ) : (
              <React.Fragment>
                <p className="lead text-center">
                  This silence will match{" "}
                  <strong>{this.matchedAlerts.alertLabels.length}</strong> alert
                  {this.matchedAlerts.alertLabels.length > 1 ? "s" : ""}
                </p>
                <div>
                  <Preview
                    alertStore={alertStore}
                    labelsList={this.matchedAlerts.alertLabels}
                  />
                </div>
              </React.Fragment>
            )}
          </div>
          <div className="d-flex flex-row-reverse">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={silenceFormStore.data.setStageSubmit}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="pr-1" />
              Submit
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary mr-2"
              onClick={silenceFormStore.data.resetProgress}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="pr-1" />
              Back
            </button>
          </div>
        </React.Fragment>
      );
    }
  }
);

export { SilencePreview };

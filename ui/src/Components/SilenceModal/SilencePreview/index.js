import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore, FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import {
  LabelSetList,
  GroupListToUniqueLabelsList
} from "Components/LabelSetList";
import { FetchGet } from "Common/Fetch";
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

const Placeholder = () => (
  <div className="jumbotron bg-transparent">
    <h1 className="display-5 text-placeholder text-center">
      <FontAwesomeIcon icon={faSpinner} size="lg" spin />
    </h1>
  </div>
);

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
        done: false,
        // take a list of groups and outputs a list of label sets, this ignores
        // the receiver, so we'll end up with only unique alerts
        groupsToUniqueLabels(groups) {
          this.alertLabels = GroupListToUniqueLabelsList(groups);
        },
        setError(value) {
          this.error = value;
        },
        setDone() {
          this.done = true;
        }
      },
      {
        groupsToUniqueLabels: action.bound,
        setError: action.bound,
        setDone: action.bound
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

      this.matchedAlerts.fetch = FetchGet(alertsURI, {})
        .then(result => {
          return result.json();
        })
        .then(result => {
          this.matchedAlerts.groupsToUniqueLabels(Object.values(result.groups));
          this.matchedAlerts.setError(null);
          this.matchedAlerts.setDone();
        })
        .catch(err => {
          console.trace(err);
          this.matchedAlerts.setDone();
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
          <div className="mb-3">
            {!this.matchedAlerts.done ? (
              <Placeholder />
            ) : this.matchedAlerts.error !== null ? (
              <FetchError message={this.matchedAlerts.error} />
            ) : (
              <LabelSetList
                alertStore={alertStore}
                labelsList={this.matchedAlerts.alertLabels}
              />
            )}
          </div>
          <div className="d-flex flex-row-reverse">
            <button
              type="button"
              className="btn btn-primary"
              onClick={silenceFormStore.data.setStageSubmit}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="pr-1" />
              Submit
            </button>
            <button
              type="button"
              className="btn btn-danger mr-2"
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

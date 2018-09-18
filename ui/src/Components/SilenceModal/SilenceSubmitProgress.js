import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

const SubmitState = Object.freeze({
  InProgress: "InProgress",
  Done: "Done",
  Failed: "Failed"
});

const SubmitIcon = observer(({ stateValue }) => {
  if (stateValue === SubmitState.Done) {
    return <FontAwesomeIcon icon={faCheckCircle} className="text-success" />;
  }
  if (stateValue === SubmitState.Failed) {
    return (
      <FontAwesomeIcon icon={faExclamationCircle} className="text-danger" />
    );
  }
  return <FontAwesomeIcon icon={faCircleNotch} spin />;
});

const SilenceLink = ({ uri, silenceId }) => (
  <a
    href={`${uri}/#/silences/${silenceId}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    {silenceId}
  </a>
);
SilenceLink.propTypes = {
  uri: PropTypes.string.isRequired,
  silenceId: PropTypes.string.isRequired
};

const SilenceSubmitProgress = observer(
  class SilenceSubmitProgress extends Component {
    static propTypes = {
      name: PropTypes.string.isRequired,
      uri: PropTypes.string.isRequired,
      payload: PropTypes.object.isRequired,
      alertStore: PropTypes.object.isRequired
    };

    submitState = observable(
      {
        // store fetch result here, useful for testing
        fetch: null,
        value: SubmitState.InProgress,
        result: null,
        markDone(result) {
          this.result = result;
          this.value = SubmitState.Done;
        },
        markFailed(result) {
          this.result = result;
          this.value = SubmitState.Failed;
        }
      },
      { markDone: action.bound, markFailed: action.bound }
    );

    handleAlertmanagerRequest = () => {
      const { uri, payload } = this.props;

      this.submitState.fetch = fetch(`${uri}/api/v1/silences`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        }
      })
        .then(result => result.json())
        .then(result => this.parseAlertmanagerResponse(result))
        .catch(err => this.submitState.markFailed(err.message));
    };

    parseAlertmanagerResponse = response => {
      const { name, alertStore } = this.props;

      const alertmanager = alertStore.data.getAlertmanagerByName(name);

      if (response.status === "success") {
        if (alertmanager) {
          const link = (
            <SilenceLink
              uri={alertmanager.uri}
              silenceId={response.data.silenceId}
            />
          );
          this.submitState.markDone(link);
        } else {
          this.submitState.markDone(response.data.silenceId);
        }
      } else if (response.status === "error") {
        this.submitState.markFailed(response.error);
      } else {
        this.submitState.markFailed(JSON.stringify(response));
      }

      // return status so we can assert it in tests
      return response.status;
    };

    componentDidMount() {
      this.handleAlertmanagerRequest();
    }

    render() {
      const { name } = this.props;

      return (
        <div className="d-flex">
          <div className="p-2 flex-fill">
            <SubmitIcon stateValue={this.submitState.value} />
          </div>
          <div className="p-2 flex-fill">{name}</div>
          <div className="p-2 flex-fill">{this.submitState.result}</div>
        </div>
      );
    }
  }
);

export { SilenceSubmitProgress };

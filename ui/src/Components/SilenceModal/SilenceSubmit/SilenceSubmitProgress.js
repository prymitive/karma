import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { APISilenceMatcher } from "Models/API";
import { AlertStore } from "Stores/AlertStore";

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
      cluster: PropTypes.string.isRequired,
      members: PropTypes.arrayOf(PropTypes.string).isRequired,
      payload: PropTypes.exact({
        matchers: PropTypes.arrayOf(APISilenceMatcher).isRequired,
        startsAt: PropTypes.string.isRequired,
        endsAt: PropTypes.string.isRequired,
        createdBy: PropTypes.string.isRequired,
        comment: PropTypes.string.isRequired
      }).isRequired,
      alertStore: PropTypes.instanceOf(AlertStore).isRequired
    };

    submitState = observable(
      {
        // store fetch result here, useful for testing
        fetch: null,
        membersToTry: [],
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

    maybeTryAgainAfterError = err => {
      if (this.submitState.membersToTry.length) {
        this.handleAlertmanagerRequest();
      } else {
        this.submitState.markFailed(err.message);
      }
    };

    handleAlertmanagerRequest = () => {
      const { payload, alertStore } = this.props;

      const member = this.submitState.membersToTry.pop();

      const am = alertStore.data.getAlertmanagerByName(member);
      if (am === undefined) {
        const err = `Alertmanager instance "${member} not found`;
        console.error(err);
        this.maybeTryAgainAfterError(err);
        return;
      }

      this.submitState.fetch = fetch(`${am.publicURI}/api/v1/silences`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        }
      })
        .then(result => result.json())
        .then(result => this.parseAlertmanagerResponse(am.uri, result))
        .catch(err => this.maybeTryAgainAfterError(err));
    };

    parseAlertmanagerResponse = (uri, response) => {
      if (response.status === "success") {
        const link = (
          <SilenceLink uri={uri} silenceId={response.data.silenceId} />
        );
        this.submitState.markDone(link);
      } else if (response.status === "error") {
        this.submitState.markFailed(response.error);
      } else {
        this.submitState.markFailed(JSON.stringify(response));
      }

      // return status so we can assert it in tests
      return response.status;
    };

    componentDidMount() {
      const { members } = this.props;
      this.submitState.membersToTry = [...members];
      this.handleAlertmanagerRequest();
    }

    render() {
      const { cluster } = this.props;

      return (
        <div className="d-flex">
          <div className="p-2 flex-fill">
            <SubmitIcon stateValue={this.submitState.value} />
          </div>
          <div className="p-2 flex-fill">{cluster}</div>
          <div className="p-2 flex-fill">{this.submitState.result}</div>
        </div>
      );
    }
  }
);

export { SilenceSubmitProgress };

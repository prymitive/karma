import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import semver from "semver";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { APISilenceMatcher } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { FetchWithCredentials } from "Common/Fetch";

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
        comment: PropTypes.string.isRequired,
        id: PropTypes.string
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

      const isOpenAPI = semver.satisfies(am.version, ">=0.16.0");

      const uri = isOpenAPI
        ? `${am.uri}/api/v2/silences`
        : `${am.uri}/api/v1/silences`;

      this.submitState.fetch = FetchWithCredentials(uri, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          ...am.headers
        }
      })
        .then(result => {
          if (isOpenAPI) {
            if (result.ok) {
              return result
                .json()
                .then(r => this.parseOpenAPIResponse(am.publicURI, r));
            } else {
              return result.text().then(text => {
                this.submitState.markFailed(text);
                return text;
              });
            }
          } else {
            return result
              .json()
              .then(r => this.parseAlertmanagerResponse(am.publicURI, r));
          }
        })
        .catch(err => {
          this.maybeTryAgainAfterError(err);
        });
    };

    parseOpenAPIResponse = (uri, response) => {
      const link = <SilenceLink uri={uri} silenceId={response.silenceID} />;
      this.submitState.markDone(link);
      // return silenceId so we can assert it in tests
      return response.silenceID;
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
        <div className="d-flex mb-2">
          <div className="p-2 flex-fill my-auto flex-grow-0 flex-shrink-0">
            <SubmitIcon stateValue={this.submitState.value} />
          </div>
          <div className="p-2 mr-1 flex-fill my-auto flex-grow-0 flex-shrink-0">
            {cluster}
          </div>
          <div
            className={`p-2 flex-fill flex-grow-1 flex-shrink-1 rounded text-center ${
              this.submitState.value === SubmitState.Failed ? "bg-light" : ""
            }`}
          >
            {this.submitState.result}
          </div>
        </div>
      );
    }
  }
);

export { SilenceSubmitProgress };

import React, { useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { APISilenceMatcher } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { FetchPost } from "Common/Fetch";

const SubmitState = Object.freeze({
  InProgress: "InProgress",
  Done: "Done",
  Failed: "Failed",
});

const SubmitIcon = ({ stateValue }) => {
  return useObserver(() =>
    stateValue === SubmitState.Done ? (
      <FontAwesomeIcon icon={faCheckCircle} className="text-success" />
    ) : stateValue === SubmitState.Failed ? (
      <FontAwesomeIcon icon={faExclamationCircle} className="text-danger" />
    ) : (
      <FontAwesomeIcon icon={faCircleNotch} spin />
    )
  );
};

const SilenceLink = ({ uri, silenceID }) => (
  <a
    href={`${uri}/#/silences/${silenceID}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    {silenceID}
  </a>
);
SilenceLink.propTypes = {
  uri: PropTypes.string.isRequired,
  silenceID: PropTypes.string.isRequired,
};

const SilenceSubmitProgress = ({ alertStore, cluster, members, payload }) => {
  const submitState = useLocalStore(() => ({
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
    },
  }));

  const handleAlertmanagerRequest = useCallback(() => {
    const member = submitState.membersToTry.pop();

    if (alertStore.data.isReadOnlyAlertmanager(member)) {
      const err = `Alertmanager instance "${member}" is read-only`;
      console.error(err);
      if (submitState.membersToTry.length) {
        return handleAlertmanagerRequest();
      } else {
        submitState.markFailed(err.message);
      }
      return;
    }

    const am = alertStore.data.getAlertmanagerByName(member);
    if (am === undefined) {
      const err = `Alertmanager instance "${member}" not found`;
      console.error(err);
      if (submitState.membersToTry.length) {
        return handleAlertmanagerRequest();
      } else {
        submitState.markFailed(err.message);
      }
      return;
    }

    const parseOpenAPIResponse = (uri, response) => {
      const link = <SilenceLink uri={uri} silenceID={response.silenceID} />;
      submitState.markDone(link);
      // return silenceID so we can assert it in tests
      return response.silenceID;
    };

    FetchPost(`${am.uri}/api/v2/silences`, {
      body: JSON.stringify(payload),
      credentials: am.corsCredentials,
      headers: {
        "Content-Type": "application/json",
        ...am.headers,
      },
    })
      .then((result) => {
        if (result.ok) {
          return result
            .json()
            .then((r) => parseOpenAPIResponse(am.publicURI, r));
        } else {
          return result.text().then((text) => {
            submitState.markFailed(text);
            return text;
          });
        }
      })
      .catch((err) => {
        if (submitState.membersToTry.length) {
          return handleAlertmanagerRequest();
        } else {
          submitState.markFailed(err.message);
        }
      });
  }, [alertStore.data, payload, submitState]);

  useEffect(() => {
    submitState.membersToTry = [...members];
    handleAlertmanagerRequest();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return useObserver(() => (
    <div className="d-flex mb-2">
      <div className="p-2 flex-fill my-auto flex-grow-0 flex-shrink-0">
        <SubmitIcon stateValue={submitState.value} />
      </div>
      <div className="p-2 mr-1 flex-fill my-auto flex-grow-0 flex-shrink-0">
        {cluster}
      </div>
      <div
        className={`p-2 flex-fill flex-grow-1 flex-shrink-1 rounded text-center ${
          submitState.value === SubmitState.Failed ? "bg-light" : ""
        }`}
      >
        {submitState.result}
      </div>
    </div>
  ));
};
SilenceSubmitProgress.propTypes = {
  cluster: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(PropTypes.string).isRequired,
  payload: PropTypes.exact({
    matchers: PropTypes.arrayOf(APISilenceMatcher).isRequired,
    startsAt: PropTypes.string.isRequired,
    endsAt: PropTypes.string.isRequired,
    createdBy: PropTypes.string.isRequired,
    comment: PropTypes.string.isRequired,
    id: PropTypes.string,
  }).isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { SilenceSubmitProgress };

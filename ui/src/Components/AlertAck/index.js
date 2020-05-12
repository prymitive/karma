import React from "react";
import PropTypes from "prop-types";

import { toJS } from "mobx";
import { useObserver, useLocalStore } from "mobx-react";

import moment from "moment";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { APIGroup } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  MatchersFromGroup,
  GenerateAlertmanagerSilenceData,
} from "Stores/SilenceFormStore";
import { FetchPost } from "Common/Fetch";
import { TooltipWrapper } from "Components/TooltipWrapper";

const SubmitState = Object.freeze({
  Idle: "Idle",
  InProgress: "InProgress",
  Done: "Done",
  Failed: "Failed",
});

const newPendingSilence = (
  group,
  members,
  durationSeconds,
  author,
  commentPrefix
) => ({
  payload: GenerateAlertmanagerSilenceData(
    moment.utc(),
    moment.utc().add(durationSeconds, "seconds"),
    MatchersFromGroup(group, [], group.alerts, true),
    author,
    `${
      commentPrefix ? commentPrefix + " " : ""
    }This alert was acknowledged using karma on ${moment.utc().toString()}`
  ),
  membersToTry: members,
  submitState: SubmitState.Idle,
  submitResult: null,
  isDone: false,
  isFailed: false,
  error: null,
});

const AlertAck = ({ alertStore, silenceFormStore, group }) => {
  const submitState = useLocalStore(() => ({
    silencesByCluster: {},
    reset() {
      this.silencesByCluster = {};
    },
    pushSilence(cluster, silence) {
      this.silencesByCluster[cluster] = silence;
    },
    markDone(cluster) {
      this.silencesByCluster[cluster].isDone = true;
    },
    markFailed(cluster, err) {
      this.silencesByCluster[cluster].isDone = true;
      this.silencesByCluster[cluster].isFailed = true;
      this.silencesByCluster[cluster].error = err;
    },
    get isIdle() {
      return Object.keys(this.silencesByCluster).length === 0;
    },
    get isInprogress() {
      return (
        Object.values(this.silencesByCluster).filter(
          (pendingSilence) => pendingSilence.isDone === false
        ).length > 0
      );
    },
    get isDone() {
      return (
        Object.values(this.silencesByCluster).filter(
          (pendingSilence) => pendingSilence.isDone === true
        ).length > 0
      );
    },
    get isFailed() {
      return (
        Object.values(this.silencesByCluster).filter(
          (pendingSilence) => pendingSilence.isFailed === true
        ).length > 0
      );
    },
    get errorMessages() {
      return Object.values(this.silencesByCluster)
        .filter((pendingSilence) => pendingSilence.error !== null)
        .map((s) => s.error);
    },
  }));

  const maybeTryAgainAfterError = (cluster, err) => {
    if (submitState.silencesByCluster[cluster].membersToTry.length) {
      handleAlertmanagerRequest(cluster);
    } else {
      submitState.markFailed(cluster, err);
    }
  };

  const handleAlertmanagerRequest = (cluster) => {
    const member = submitState.silencesByCluster[cluster].membersToTry.pop();

    const am = alertStore.data.getAlertmanagerByName(member);
    if (am === undefined) {
      const err = `Alertmanager instance "${member} not found`;
      console.error(err);
      maybeTryAgainAfterError(cluster, err);
      return;
    }

    FetchPost(`${am.uri}/api/v2/silences`, {
      body: JSON.stringify(submitState.silencesByCluster[cluster].payload),
      credentials: am.corsCredentials,
      headers: {
        "Content-Type": "application/json",
        ...am.headers,
      },
    })
      .then((result) => {
        if (result.ok) {
          return result.json().then((r) => submitState.markDone(cluster));
        } else {
          result.text().then((text) => maybeTryAgainAfterError(cluster, text));
        }
      })
      .catch((err) => {
        maybeTryAgainAfterError(cluster, err);
      });
  };

  const onACK = () => {
    if (submitState.isInprogress || submitState.isDone) {
      return;
    }

    let author =
      silenceFormStore.data.author !== ""
        ? toJS(silenceFormStore.data.author)
        : toJS(alertStore.settings.values.alertAcknowledgement.author);

    if (alertStore.info.authentication.enabled) {
      silenceFormStore.data.author = toJS(
        alertStore.info.authentication.username
      );
      author = alertStore.info.authentication.username;
    }

    const alertmanagers = Object.entries(group.alertmanagerCount)
      .filter(([amName, alertCount]) => alertCount > 0)
      .map(([amName, _]) => amName);
    const clusters = Object.entries(
      alertStore.data.clustersWithoutReadOnly
    ).filter(([clusterName, clusterMembers]) =>
      alertmanagers.some((m) => clusterMembers.includes(m))
    );

    submitState.reset();
    for (const [clusterName, clusterMembers] of clusters) {
      const pendingSilence = newPendingSilence(
        toJS(group),
        toJS(clusterMembers),
        toJS(alertStore.settings.values.alertAcknowledgement.durationSeconds),
        author,
        toJS(alertStore.settings.values.alertAcknowledgement.commentPrefix)
      );
      submitState.pushSilence(clusterName, pendingSilence);
      handleAlertmanagerRequest(clusterName);
    }
  };

  return useObserver(() =>
    alertStore.settings.values.alertAcknowledgement.enabled === false ? null : (
      <TooltipWrapper
        html={submitState.isFailed ? submitState.errorMessages[0] : null}
        title={
          submitState.isFailed
            ? null
            : "Acknowledge this alert with a short lived silence"
        }
      >
        <span
          className={`badge badge-pill components-label components-label-with-hover px-2 ${
            submitState.isFailed
              ? "badge-warning"
              : submitState.isDone
              ? "badge-success"
              : "badge-secondary"
          }`}
          onClick={onACK}
        >
          {submitState.isIdle ? (
            <FontAwesomeIcon icon={faCheck} fixedWidth />
          ) : submitState.isInprogress ? (
            <FontAwesomeIcon icon={faSpinner} fixedWidth spin />
          ) : submitState.isFailed ? (
            <FontAwesomeIcon icon={faExclamationCircle} fixedWidth />
          ) : (
            <FontAwesomeIcon icon={faCheckCircle} fixedWidth />
          )}
        </span>
      </TooltipWrapper>
    )
  );
};
AlertAck.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  group: APIGroup.isRequired,
};

export { AlertAck };

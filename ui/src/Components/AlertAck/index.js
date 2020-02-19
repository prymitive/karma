import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, computed, toJS } from "mobx";
import { observer } from "mobx-react";

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
  GenerateAlertmanagerSilenceData
} from "Stores/SilenceFormStore";
import { FetchPost } from "Common/Fetch";
import { TooltipWrapper } from "Components/TooltipWrapper";

const SubmitState = Object.freeze({
  Idle: "Idle",
  InProgress: "InProgress",
  Done: "Done",
  Failed: "Failed"
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
    MatchersFromGroup(group, []),
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
  fetch: null
});

const AlertAck = observer(
  class AlertAck extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      group: APIGroup.isRequired
    };

    constructor(props) {
      super(props);
      this.submitState = observable(
        {
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
          markFailed(cluster) {
            this.silencesByCluster[cluster].isDone = true;
            this.silencesByCluster[cluster].isFailed = true;
          },
          get isIdle() {
            return Object.keys(this.silencesByCluster).length === 0;
          },
          get isInprogress() {
            return (
              Object.values(this.silencesByCluster).filter(
                pendingSilence => pendingSilence.isDone === false
              ).length > 0
            );
          },
          get isDone() {
            return (
              Object.values(this.silencesByCluster).filter(
                pendingSilence => pendingSilence.isDone === true
              ).length > 0
            );
          },
          get isFailed() {
            return (
              Object.values(this.silencesByCluster).filter(
                pendingSilence => pendingSilence.isFailed === true
              ).length > 0
            );
          }
        },
        {
          reset: action.bound,
          pushSilence: action.bound,
          markDone: action.bound,
          markFailed: action.bound,
          isIdle: computed,
          isInprogress: computed,
          isDone: computed,
          isFailed: computed
        }
      );
    }

    maybeTryAgainAfterError = cluster => {
      if (this.submitState.silencesByCluster[cluster].membersToTry.length) {
        this.handleAlertmanagerRequest(cluster);
      } else {
        this.submitState.markFailed(cluster);
      }
    };

    handleAlertmanagerRequest = cluster => {
      const { alertStore } = this.props;

      const member = this.submitState.silencesByCluster[
        cluster
      ].membersToTry.pop();

      const am = alertStore.data.getAlertmanagerByName(member);
      if (am === undefined) {
        const err = `Alertmanager instance "${member} not found`;
        console.error(err);
        this.maybeTryAgainAfterError(cluster);
        return;
      }

      this.submitState.silencesByCluster[cluster].fetch = FetchPost(
        `${am.uri}/api/v2/silences`,
        {
          body: JSON.stringify(
            this.submitState.silencesByCluster[cluster].payload
          ),
          credentials: am.corsCredentials,
          headers: {
            "Content-Type": "application/json",
            ...am.headers
          }
        }
      )
        .then(result => {
          if (result.ok) {
            return result.json().then(r => this.submitState.markDone(cluster));
          } else {
            this.maybeTryAgainAfterError(cluster);
          }
        })
        .catch(() => {
          this.maybeTryAgainAfterError(cluster);
        });
    };

    onACK = () => {
      const { group, alertStore, silenceFormStore } = this.props;

      if (this.submitState.isInprogress || this.submitState.isDone) {
        return;
      }

      const alertmanagers = Object.entries(group.alertmanagerCount)
        .filter(([amName, alertCount]) => alertCount > 0)
        .map(([amName, _]) => amName);
      const clusters = Object.entries(
        alertStore.data.clustersWithoutReadOnly
      ).filter(([clusterName, clusterMembers]) =>
        alertmanagers.some(m => clusterMembers.includes(m))
      );

      this.submitState.reset();
      for (const [clusterName, clusterMembers] of clusters) {
        const pendingSilence = newPendingSilence(
          toJS(group),
          toJS(clusterMembers),
          toJS(alertStore.settings.values.alertAcknowledgement.durationSeconds),
          alertStore.settings.values.silenceForm.author !== ""
            ? alertStore.settings.values.silenceForm.author
            : silenceFormStore.data.author !== ""
            ? toJS(silenceFormStore.data.author)
            : toJS(alertStore.settings.values.alertAcknowledgement.author),
          toJS(alertStore.settings.values.alertAcknowledgement.commentPrefix)
        );
        this.submitState.pushSilence(clusterName, pendingSilence);
        this.handleAlertmanagerRequest(clusterName);
      }
    };

    render() {
      const { alertStore } = this.props;

      if (alertStore.settings.values.alertAcknowledgement.enabled === false) {
        return null;
      }

      return (
        <TooltipWrapper title="Acknowlage this alert with a short lived silence">
          <span
            className={`badge badge-pill components-label components-label-with-hover px-2 ${
              this.submitState.isFailed
                ? "badge-warning"
                : this.submitState.isDone
                ? "badge-success"
                : "badge-secondary"
            }`}
            onClick={this.onACK}
          >
            {this.submitState.isIdle ? (
              <FontAwesomeIcon icon={faCheck} fixedWidth />
            ) : this.submitState.isInprogress ? (
              <FontAwesomeIcon icon={faSpinner} fixedWidth spin />
            ) : this.submitState.isFailed ? (
              <FontAwesomeIcon icon={faExclamationCircle} fixedWidth />
            ) : (
              <FontAwesomeIcon icon={faCheckCircle} fixedWidth />
            )}
          </span>
        </TooltipWrapper>
      );
    }
  }
);

export { AlertAck };

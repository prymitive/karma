import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import hash from "object-hash";

import moment from "moment";
import Moment from "react-moment";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faCalendarCheck } from "@fortawesome/free-solid-svg-icons/faCalendarCheck";
import { faCalendarTimes } from "@fortawesome/free-solid-svg-icons/faCalendarTimes";
import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";

import {
  APIAlertAlertmanagerState,
  APIAlertmanagerUpstream,
  APISilence
} from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { StaticLabels, QueryOperators } from "Common/Query";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { RenderLinkAnnotation } from "../Annotation";

import "./index.css";

const SilenceComment = ({ silence }) => {
  if (silence.jiraURL) {
    return (
      <a href={silence.jiraURL} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon className="mr-1" icon={faExternalLinkAlt} />
        {silence.comment}
      </a>
    );
  }
  return silence.comment;
};
SilenceComment.propTypes = {
  silence: APISilence.isRequired
};

const SilenceExpiryBadgeWithProgress = ({ silence, progress }) => {
  // if silence is expired we can skip progress value calculation
  if (moment(silence.endsAt) < moment()) {
    return (
      <span className="badge badge-danger text-nowrap text-truncate mw-100 align-bottom">
        Expired <Moment fromNow>{silence.endsAt}</Moment>
      </span>
    );
  }

  let progressClass;
  if (progress > 90) {
    progressClass = "progress-bar bg-danger";
  } else if (progress > 75) {
    progressClass = "progress-bar bg-warning";
  } else {
    progressClass = "progress-bar bg-success";
  }

  return (
    <span className="badge badge-light nmb-05 text-nowrap text-truncate mw-100 align-bottom">
      Expires <Moment fromNow>{silence.endsAt}</Moment>
      <div className="progress silence-progress bg-white">
        <div
          className={progressClass}
          role="progressbar"
          style={{ width: progress + "%" }}
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
    </span>
  );
};
SilenceExpiryBadgeWithProgress.propTypes = {
  silence: APISilence.isRequired,
  progress: PropTypes.number.isRequired
};

const SilenceDetails = ({ alertmanager, silence, onEditSilence }) => {
  let expiresClass = "";
  let expiresLabel = "Expires";
  if (moment(silence.endsAt) < moment()) {
    expiresClass = "text-danger";
    expiresLabel = "Expired";
  }

  return (
    <div className="mt-1">
      <div>
        <FilteringLabel
          name={StaticLabels.AlertManager}
          value={alertmanager.name}
        />
        <RenderLinkAnnotation
          name={silence.id}
          value={`${alertmanager.uri}/#/silences/${silence.id}`}
        />
      </div>
      <div>
        <span className="badge text-nowrap text-truncate px-1 mr-1">
          <FontAwesomeIcon className="text-muted mr-1" icon={faCalendarCheck} />
          Created <Moment fromNow>{silence.startsAt}</Moment>
        </span>
        <span
          className={`badge ${expiresClass} text-nowrap text-truncate px-1 mr-1`}
        >
          <FontAwesomeIcon className="text-muted mr-1" icon={faCalendarTimes} />
          {expiresLabel} <Moment fromNow>{silence.endsAt}</Moment>
        </span>
        <span
          className="badge badge-secondary text-nowrap text-truncate px-1 cursor-pointer components-label-with-hover"
          onClick={onEditSilence}
        >
          <FontAwesomeIcon className="mr-1" icon={faEdit} />
          Edit
        </span>
      </div>
      <div>
        <span className="badge text-nowrap text-truncate px-1 mr-1">
          <FontAwesomeIcon className="text-muted mr-1" icon={faFilter} />
          Matchers:
        </span>
        {silence.matchers.map(matcher => (
          <span
            key={hash(matcher)}
            className="badge badge-light text-nowrap text-truncate px-1 mr-1"
          >
            {matcher.name}
            {matcher.isRegex ? QueryOperators.Regex : QueryOperators.Equal}
            {matcher.value}
          </span>
        ))}
      </div>
    </div>
  );
};
SilenceDetails.propTypes = {
  alertmanager: APIAlertmanagerUpstream.isRequired,
  silence: APISilence.isRequired,
  onEditSilence: PropTypes.func.isRequired
};

//
const FallbackSilenceDesciption = ({ alertmanagerName, silenceID }) => {
  return (
    <div>
      <small className="text-muted">
        Silenced by {alertmanagerName}/{silenceID}
      </small>
    </div>
  );
};
FallbackSilenceDesciption.propTypes = {
  alertmanagerName: PropTypes.string.isRequired,
  silenceID: PropTypes.string.isRequired
};

const Silence = inject("alertStore")(
  observer(
    class Silence extends Component {
      static propTypes = {
        alertStore: PropTypes.instanceOf(AlertStore).isRequired,
        silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
        alertmanagerState: APIAlertAlertmanagerState.isRequired,
        silenceID: PropTypes.string.isRequired,
        afterUpdate: PropTypes.func.isRequired
      };

      // store collapse state, by default only silence comment is visible
      // the rest of the silence is hidden until expanded by a click
      collapse = observable(
        {
          value: true,
          toggle() {
            this.value = !this.value;
          }
        },
        { toggle: action.bound },
        { name: "Silence collpase toggle" }
      );

      progress = observable(
        {
          value: 0,
          calculate(startsAt, endsAt) {
            const durationDone = moment().unix() - moment(startsAt).unix();
            const durationTotal =
              moment(endsAt).unix() - moment(startsAt).unix();
            const durationPercent = Math.floor(
              (durationDone / durationTotal) * 100
            );
            if (this.value !== durationPercent) {
              this.value = durationPercent;
            }
          }
        },
        {
          calculate: action.bound
        }
      );

      constructor(props) {
        super(props);

        this.recalculateProgress();
        this.progressTimer = setInterval(this.recalculateProgress, 30 * 1000);
      }

      getAlertmanager = () => {
        const { alertStore, alertmanagerState } = this.props;

        const alertmanager = alertStore.data.getAlertmanagerByName(
          alertmanagerState.name
        );

        if (alertmanager) return alertmanager;

        return {
          name: alertmanagerState.name
        };
      };

      getSilence = () => {
        const { alertStore, alertmanagerState, silenceID } = this.props;

        // We pass alertmanager name and silence ID to Silence component
        // and we need to lookup the actual silence data in the store.
        // Data might be missing from the store so first check if we have
        // anything for this alertmanager instance
        const amSilences = alertStore.data.silences[alertmanagerState.name];
        if (!amSilences) return null;

        // next check if alertmanager has our silence ID
        const silence = amSilences[silenceID];
        if (!silence) return null;

        return silence;
      };

      recalculateProgress = () => {
        const silence = this.getSilence();
        if (silence !== null) {
          this.progress.calculate(silence.startsAt, silence.endsAt);
        }
      };

      onEditSilence = () => {
        const { silenceFormStore } = this.props;

        const silence = this.getSilence();
        const alertmanager = this.getAlertmanager();

        silenceFormStore.data.fillFormFromSilence(alertmanager, silence);
        silenceFormStore.data.resetProgress();
        silenceFormStore.toggle.show();
      };

      componentDidUpdate() {
        const { afterUpdate } = this.props;
        afterUpdate();
      }

      componentWillUnmount() {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }

      render() {
        const { alertmanagerState, silenceID } = this.props;

        const silence = this.getSilence();
        if (!silence)
          return (
            <FallbackSilenceDesciption
              alertmanagerName={alertmanagerState.name}
              silenceID={silenceID}
            />
          );

        const alertmanager = this.getAlertmanager();

        return (
          <div className="card mt-1 border-0 p-1">
            <div className="card-text mb-0">
              <span className="text-muted my-1">
                <SilenceComment silence={silence} />
                <span className="blockquote-footer pt-1">
                  <a
                    className="float-right cursor-pointer"
                    onClick={this.collapse.toggle}
                  >
                    <FontAwesomeIcon
                      icon={this.collapse.value ? faChevronUp : faChevronDown}
                    />
                  </a>
                  <cite className="components-grid-alertgroup-silences mr-2">
                    {silence.createdBy}
                  </cite>
                  {this.collapse.value ? (
                    <SilenceExpiryBadgeWithProgress
                      silence={silence}
                      progress={this.progress.value}
                    />
                  ) : null}
                </span>
              </span>
            </div>
            {this.collapse.value ? null : (
              <SilenceDetails
                alertmanager={alertmanager}
                silence={silence}
                onEditSilence={this.onEditSilence}
              />
            )}
          </div>
        );
      }
    }
  )
);

export { Silence, SilenceDetails, SilenceExpiryBadgeWithProgress };

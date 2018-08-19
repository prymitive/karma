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

import { StaticLabels, QueryOperators } from "Common/Query";
import { FilteringLabel } from "Components/Labels/FilteringLabel";

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
  silence: PropTypes.object.isRequired
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
  silence: PropTypes.object.isRequired,
  progress: PropTypes.number.isRequired
};

const SilenceDetails = ({ alertmanager, silence }) => {
  let expiresClass = "secondary";
  let expiresLabel = "Expires";
  if (moment(silence.endsAt) < moment()) {
    expiresClass = "danger";
    expiresLabel = "Expired";
  }

  return (
    <div className="mt-1">
      <FilteringLabel
        name={StaticLabels.AlertManager}
        value={alertmanager.name}
      />
      <a
        className="badge badge-secondary text-nowrap text-truncate px-1 mr-1"
        href={`${alertmanager.uri}/#/silences/${silence.id}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {silence.id}
      </a>
      <span className="badge badge-secondary text-nowrap text-truncate px-1 mr-1">
        Silenced <Moment fromNow>{silence.startsAt}</Moment>
      </span>
      <span
        className={`badge badge-${expiresClass} text-nowrap text-truncate px-1 mr-1`}
      >
        {expiresLabel} <Moment fromNow>{silence.endsAt}</Moment>
      </span>
      {silence.matchers.map(matcher => (
        <span
          key={hash(matcher)}
          className="badge badge-success text-nowrap text-truncate px-1 mr-1"
        >
          {matcher.name}
          {matcher.isRegex ? QueryOperators.Regex : QueryOperators.Equal}
          {matcher.value}
        </span>
      ))}
    </div>
  );
};
SilenceDetails.propTypes = {
  alertmanager: PropTypes.object.isRequired,
  silence: PropTypes.object.isRequired
};

//
const FallbackSilenceDesciption = ({ alertmanager, silenceID }) => {
  return (
    <div>
      <small className="text-muted">
        Silenced by {alertmanager.name}/{silenceID}
      </small>
    </div>
  );
};
FallbackSilenceDesciption.propTypes = {
  alertmanager: PropTypes.object.isRequired,
  silenceID: PropTypes.string.isRequired
};

const Silence = inject("alertStore")(
  observer(
    class Silence extends Component {
      static propTypes = {
        alertStore: PropTypes.object.isRequired,
        alertmanager: PropTypes.object.isRequired,
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

      getSilence = () => {
        const { alertStore, alertmanager, silenceID } = this.props;

        // We pass alertmanager name and silence ID to Silence component
        // and we need to lookup the actual silence data in the store.
        // Data might be missing from the store so first check if we have
        // anything for this alertmanager instance
        const amSilences = alertStore.data.silences[alertmanager.name];
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

      componentDidUpdate() {
        const { afterUpdate } = this.props;
        afterUpdate();
      }

      componentWillUnmount() {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }

      render() {
        const { alertmanager, silenceID } = this.props;

        const silence = this.getSilence();
        if (!silence)
          return (
            <FallbackSilenceDesciption
              alertmanager={alertmanager}
              silenceID={silenceID}
            />
          );

        return (
          <div className="card mt-1 border-0 p-1">
            <div className="card-text mb-0">
              <span className="text-muted my-1">
                <SilenceComment silence={silence} />
                <span className="blockquote-footer pt-1">
                  <a
                    className="float-right cursor-pointer"
                    onClick={this.collapse.toggle}
                    data-tooltip="Collapse/expand silence details"
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
              <SilenceDetails alertmanager={alertmanager} silence={silence} />
            )}
          </div>
        );
      }
    }
  )
);

export { Silence, SilenceDetails, SilenceExpiryBadgeWithProgress };

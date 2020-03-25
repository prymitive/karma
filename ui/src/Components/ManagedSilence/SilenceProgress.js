import React, { Component } from "react";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import moment from "moment";
import Moment from "react-moment";

import { APISilence } from "Models/API";

import "./SilenceProgress.scss";

const SilenceProgress = observer(
  class SilenceProgress extends Component {
    static propTypes = {
      silence: APISilence.isRequired,
    };

    progress = observable(
      {
        value: 0,
        calculate(startsAt, endsAt) {
          const durationDone = moment().unix() - moment(startsAt).unix();
          const durationTotal = moment(endsAt).unix() - moment(startsAt).unix();
          const durationPercent = Math.floor(
            (durationDone / durationTotal) * 100
          );
          if (this.value !== durationPercent) {
            this.value = durationPercent;
          }
        },
      },
      {
        calculate: action.bound,
      }
    );

    constructor(props) {
      super(props);

      this.recalculateProgress();
      this.progressTimer = setInterval(this.recalculateProgress, 30 * 1000);
    }

    componentWillUnmount() {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }

    recalculateProgress = () => {
      const { silence } = this.props;
      this.progress.calculate(silence.startsAt, silence.endsAt);
    };

    render() {
      const { silence } = this.props;

      // if silence is expired we can skip progress value calculation
      if (moment(silence.endsAt) < moment()) {
        return (
          <span className="badge badge-danger align-text-bottom p-1">
            Expired <Moment fromNow>{silence.endsAt}</Moment>
          </span>
        );
      }

      let progressClass;
      if (this.progress.value > 90) {
        progressClass = "progress-bar bg-danger";
      } else if (this.progress.value > 75) {
        progressClass = "progress-bar bg-warning";
      } else {
        progressClass = "progress-bar bg-success";
      }

      return (
        <span className="badge badge-light nmb-05 align-text-bottom p-1">
          Expires <Moment fromNow>{silence.endsAt}</Moment>
          <div className="progress silence-progress">
            <div
              className={progressClass}
              role="progressbar"
              style={{ width: this.progress.value + "%" }}
              aria-valuenow={this.progress.value}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </span>
      );
    }
  }
);

export { SilenceProgress };

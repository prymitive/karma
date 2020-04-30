import React, { useEffect } from "react";

import { useObserver, useLocalStore } from "mobx-react";

import moment from "moment";
import Moment from "react-moment";

import { APISilence } from "Models/API";

import "./SilenceProgress.scss";

const SilenceProgress = ({ silence }) => {
  const progress = useLocalStore(() => ({
    value: 0,
    calculate(startsAt, endsAt) {
      const durationDone = moment().unix() - moment(startsAt).unix();
      const durationTotal = moment(endsAt).unix() - moment(startsAt).unix();
      const durationPercent = Math.floor((durationDone / durationTotal) * 100);
      if (this.value !== durationPercent) {
        this.value = durationPercent;
      }
    },
  }));

  useEffect(() => {
    progress.calculate(silence.startsAt, silence.endsAt);

    const timer = setInterval(() => {
      progress.calculate(silence.startsAt, silence.endsAt);
    }, 30 * 1000);
    return () => clearInterval(timer);
  }, [progress, silence.startsAt, silence.endsAt]);

  return useObserver(() =>
    moment(silence.endsAt) < moment() ? (
      <span className="badge badge-danger align-text-bottom p-1">
        Expired <Moment fromNow>{silence.endsAt}</Moment>
      </span>
    ) : (
      <span className="badge badge-light nmb-05 align-text-bottom p-1">
        Expires <Moment fromNow>{silence.endsAt}</Moment>
        <div className="progress silence-progress">
          <div
            className={
              progress.value > 90
                ? "progress-bar bg-danger"
                : progress.value > 75
                ? "progress-bar bg-warning"
                : "progress-bar bg-success"
            }
            role="progressbar"
            style={{ width: progress.value + "%" }}
            aria-valuenow={progress.value}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
      </span>
    )
  );
};
SilenceProgress.propTypes = {
  silence: APISilence.isRequired,
};

export { SilenceProgress };

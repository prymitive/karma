import React, { useEffect, useState } from "react";

import { useObserver } from "mobx-react-lite";

import moment from "moment";
import Moment from "react-moment";

import { APISilence } from "Models/API";

import "./SilenceProgress.scss";

const calculatePercent = (startsAt, endsAt) => {
  const durationDone = moment().unix() - moment(startsAt).unix();
  const durationTotal = moment(endsAt).unix() - moment(startsAt).unix();
  return Math.floor((durationDone / durationTotal) * 100);
};

const SilenceProgress = ({ silence }) => {
  const [progress, setProgress] = useState(
    calculatePercent(silence.startsAt, silence.endsAt)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(calculatePercent(silence.startsAt, silence.endsAt));
    }, 30 * 1000);
    return () => clearInterval(timer);
  }, [silence.startsAt, silence.endsAt]);

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
              progress > 90
                ? "progress-bar bg-danger"
                : progress > 75
                ? "progress-bar bg-warning"
                : "progress-bar bg-success"
            }
            role="progressbar"
            style={{ width: progress + "%" }}
            aria-valuenow={progress}
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

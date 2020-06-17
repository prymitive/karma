import React, { useEffect, useState } from "react";

import { useObserver } from "mobx-react-lite";

import parseISO from "date-fns/parseISO";
import getUnixTime from "date-fns/getUnixTime";

import { APISilence } from "Models/API";
import { DateFromNow } from "Components/DateFromNow";

import "./SilenceProgress.scss";

const calculatePercent = (startsAt, endsAt) => {
  const durationDone =
    getUnixTime(new Date()) - getUnixTime(parseISO(startsAt));
  const durationTotal =
    getUnixTime(parseISO(endsAt)) - getUnixTime(parseISO(startsAt));
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
    parseISO(silence.endsAt) < new Date() ? (
      <span className="badge badge-danger align-text-bottom p-1">
        Expired <DateFromNow timestamp={silence.endsAt} />
      </span>
    ) : (
      <span className="badge badge-light nmb-05 align-text-bottom p-1">
        Expires <DateFromNow timestamp={silence.endsAt} />
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

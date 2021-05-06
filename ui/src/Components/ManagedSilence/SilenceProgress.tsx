import { FC, useEffect, useState } from "react";

import { observer } from "mobx-react-lite";

import parseISO from "date-fns/parseISO";
import getUnixTime from "date-fns/getUnixTime";

import { APISilenceT } from "Models/APITypes";
import { DateFromNow } from "Components/DateFromNow";

const calculatePercent = (startsAt: string, endsAt: string) => {
  const durationDone =
    getUnixTime(new Date()) - getUnixTime(parseISO(startsAt));
  const durationTotal =
    getUnixTime(parseISO(endsAt)) - getUnixTime(parseISO(startsAt));
  return Math.floor((durationDone / durationTotal) * 100);
};

const SilenceProgress: FC<{
  silence: APISilenceT;
}> = observer(({ silence }) => {
  const [progress, setProgress] = useState<number>(
    calculatePercent(silence.startsAt, silence.endsAt)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(calculatePercent(silence.startsAt, silence.endsAt));
    }, 30 * 1000);
    return () => clearInterval(timer);
  }, [silence.startsAt, silence.endsAt]);

  return parseISO(silence.endsAt) < new Date() ? (
    <span className="badge bg-danger align-text-bottom p-1">
      Expired <DateFromNow timestamp={silence.endsAt} />
    </span>
  ) : (
    <span className="badge bg-light nmb-05 align-text-bottom p-1">
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
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </span>
  );
});

export { SilenceProgress };

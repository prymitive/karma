import { FC, useEffect, useState } from "react";

import { observer } from "mobx-react-lite";

import { parseISO } from "date-fns/parseISO";
import { getUnixTime } from "date-fns/getUnixTime";

import type { APISilenceT, APIAlertmanagerUpstreamT } from "Models/APITypes";
import type { AlertStore } from "Stores/AlertStore";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceComment } from "./SilenceComment";
import { SilenceDetails } from "./SilenceDetails";

const GetAlertmanager = (
  alertStore: AlertStore,
  cluster: string,
): APIAlertmanagerUpstreamT =>
  alertStore.data.readWriteAlertmanagers
    .filter((u) => u.cluster === cluster)
    .slice(0, 1)[0];

const calculatePercent = (startsAt: string, endsAt: string) => {
  const durationDone =
    getUnixTime(new Date()) - getUnixTime(parseISO(startsAt));
  const durationTotal =
    getUnixTime(parseISO(endsAt)) - getUnixTime(parseISO(startsAt));
  return Math.floor((durationDone / durationTotal) * 100);
};

const ManagedSilence: FC<{
  cluster: string;
  alertCount: number;
  alertCountAlwaysVisible: boolean;
  silence: APISilenceT;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  isOpen?: boolean;
  onDidUpdate?: () => void;
  isNested?: boolean;
}> = observer(
  ({
    cluster,
    alertCount,
    alertCountAlwaysVisible,
    silence,
    alertStore,
    silenceFormStore,
    isOpen = false,
    onDidUpdate,
    isNested = false,
  }) => {
    useEffect(() => {
      if (onDidUpdate) onDidUpdate();
    });

    const [showDetails, setShowDetails] = useState<boolean>(isOpen);

    const onEditSilence = () => {
      const alertmanager = GetAlertmanager(alertStore, cluster);

      silenceFormStore.data.fillFormFromSilence(alertmanager, silence);
      silenceFormStore.data.resetProgress();
      silenceFormStore.tab.setTab("editor");
      silenceFormStore.toggle.show();
    };

    const [progress, setProgress] = useState<number>(
      calculatePercent(silence.startsAt, silence.endsAt),
    );

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress(calculatePercent(silence.startsAt, silence.endsAt));
      }, 30 * 1000);
      return () => clearInterval(timer);
    }, [silence.startsAt, silence.endsAt]);

    return (
      <div className="card my-1 components-managed-silence w-100">
        <div className="card-header rounded-0 border-bottom-0 px-2">
          <SilenceComment
            alertStore={alertStore}
            cluster={cluster}
            silence={silence}
            alertCount={alertCount}
            alertCountAlwaysVisible={alertCountAlwaysVisible}
            collapsed={!showDetails}
            collapseToggle={() => setShowDetails(!showDetails)}
          />
        </div>
        {showDetails ? (
          <div className="card-body pt-0 px-2">
            <SilenceDetails
              cluster={cluster}
              silence={silence}
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              onEditSilence={onEditSilence}
              isUpper={isNested}
            />
          </div>
        ) : null}
        <div className="progress silence-progress mx-2 mb-1">
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
      </div>
    );
  },
);
ManagedSilence.displayName = "ManagedSilence";

export { ManagedSilence, GetAlertmanager };

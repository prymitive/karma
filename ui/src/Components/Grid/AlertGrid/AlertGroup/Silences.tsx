import { FC, memo } from "react";

import { APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { ManagedSilence } from "Components/ManagedSilence";

const FallbackSilenceDesciption: FC<{
  silenceID: string;
}> = ({ silenceID }) => {
  return (
    <div className="m-1">
      <small className="text-muted">Silenced by {silenceID}</small>
    </div>
  );
};

const GetSilenceFromStore = (
  alertStore: AlertStore,
  cluster: string,
  silenceID: string
): APISilenceT | null => {
  const amSilences = alertStore.data.silences[cluster];
  if (!amSilences) return null;

  // next check if alertmanager has our silence ID
  const silence = amSilences[silenceID];
  if (!silence) return null;

  return silence;
};

const RenderSilence: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  afterUpdate: () => void;
  cluster: string;
  silenceID: string;
}> = memo(
  ({ alertStore, silenceFormStore, afterUpdate, cluster, silenceID }) => {
    const silence = GetSilenceFromStore(alertStore, cluster, silenceID);

    if (silence === null) {
      return (
        <FallbackSilenceDesciption
          key={silenceID}
          silenceID={silenceID}
        ></FallbackSilenceDesciption>
      );
    }

    return (
      <ManagedSilence
        key={silenceID}
        cluster={cluster}
        alertCount={0}
        alertCountAlwaysVisible={false}
        silence={silence}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        onDidUpdate={afterUpdate}
      />
    );
  },
  (prevProps, nextProps) => {
    if (
      prevProps.cluster === nextProps.cluster &&
      prevProps.silenceID === nextProps.silenceID
    ) {
      return (
        GetSilenceFromStore(
          nextProps.alertStore,
          nextProps.cluster,
          nextProps.silenceID
        ) === null
      );
    }
    return false;
  }
);

export { RenderSilence };

import { FC, useEffect, useState } from "react";

import { APISilenceT, APIAlertmanagerUpstreamT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceComment } from "./SilenceComment";
import { SilenceDetails } from "./SilenceDetails";

const GetAlertmanager = (
  alertStore: AlertStore,
  cluster: string
): APIAlertmanagerUpstreamT =>
  alertStore.data.readWriteAlertmanagers
    .filter((u) => u.cluster === cluster)
    .slice(0, 1)[0];

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
}> = ({
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

  return (
    <div className="card my-1 components-managed-silence">
      <div className="card-header rounded-0 border-bottom-0 px-3">
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
        <div className="card-body pt-0">
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
    </div>
  );
};

export { ManagedSilence, GetAlertmanager };

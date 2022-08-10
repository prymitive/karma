import type { FC } from "react";

import { observer } from "mobx-react-lite";

import type { AlertStore } from "Stores/AlertStore";
import type { Settings } from "Stores/Settings";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import AlertGrid from "./AlertGrid";
import { FatalError } from "./FatalError";
import { UpgradeNeeded } from "./UpgradeNeeded";
import { ReloadNeeded } from "./ReloadNeeded";
import { EmptyGrid } from "./EmptyGrid";
import { NoUpstream } from "./NoUpstream";

const Grid: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
}> = ({ alertStore, settingsStore, silenceFormStore }) => {
  return alertStore.info.upgradeNeeded ? (
    <UpgradeNeeded newVersion={alertStore.info.version} reloadAfter={3000} />
  ) : alertStore.info.reloadNeeded ? (
    <ReloadNeeded reloadAfter={4000} />
  ) : alertStore.status.error ? (
    <FatalError message={alertStore.status.error} />
  ) : alertStore.data.upstreams.counters &&
    alertStore.data.upstreams.counters.total === 1 &&
    alertStore.data.upstreams.counters.healthy === 0 &&
    alertStore.data.upstreams.instances[0] &&
    alertStore.data.upstreams.instances[0].error !== "" &&
    alertStore.info.totalAlerts === 0 ? (
    <FatalError message={alertStore.data.upstreams.instances[0].error} />
  ) : alertStore.info.version !== "unknown" &&
    alertStore.info.totalAlerts === 0 ? (
    alertStore.data.upstreams.instances.length === 0 ? (
      <NoUpstream />
    ) : (
      <EmptyGrid />
    )
  ) : (
    <AlertGrid
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

export default observer(Grid);

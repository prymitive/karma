import { useDeferredValue, FC } from "react";

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

type GridMode =
  "upgrade" | "reload" | "fatal" | "no-upstream" | "empty" | "grid";

const getGridMode = (alertStore: AlertStore): GridMode => {
  if (alertStore.info.upgradeNeeded) return "upgrade";
  if (alertStore.info.reloadNeeded) return "reload";
  if (alertStore.status.error) return "fatal";
  if (
    alertStore.data.upstreams.counters &&
    alertStore.data.upstreams.counters.total === 1 &&
    alertStore.data.upstreams.counters.healthy === 0 &&
    alertStore.data.upstreams.instances[0] &&
    alertStore.data.upstreams.instances[0].error !== "" &&
    alertStore.info.totalAlerts === 0
  )
    return "fatal";
  if (
    alertStore.info.version !== "unknown" &&
    alertStore.info.totalAlerts === 0
  ) {
    return alertStore.data.upstreams.instances.length === 0
      ? "no-upstream"
      : "empty";
  }
  return "grid";
};

const Grid: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
  silenceFormStore: SilenceFormStore;
}> = ({ alertStore, settingsStore, silenceFormStore }) => {
  // Store changes render urgently, which skips view transitions, so the
  // mode is deferred to make the view swap render inside a Transition.
  const mode = useDeferredValue(getGridMode(alertStore));

  switch (mode) {
    case "upgrade":
      return (
        <UpgradeNeeded
          newVersion={alertStore.info.version}
          reloadAfter={3000}
        />
      );
    case "reload":
      return <ReloadNeeded reloadAfter={4000} />;
    case "fatal":
      return (
        <FatalError
          message={
            alertStore.status.error ||
            alertStore.data.upstreams.instances[0].error
          }
        />
      );
    case "no-upstream":
      return <NoUpstream />;
    case "empty":
      return <EmptyGrid />;
    case "grid":
      return (
        <AlertGrid
          alertStore={alertStore}
          settingsStore={settingsStore}
          silenceFormStore={silenceFormStore}
        />
      );
  }
};

export default observer(Grid);

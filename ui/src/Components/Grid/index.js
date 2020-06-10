import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertGrid } from "./AlertGrid";
import { FatalError } from "./FatalError";
import { UpstreamError } from "./UpstreamError";
import { UpgradeNeeded } from "./UpgradeNeeded";
import { ReloadNeeded } from "./ReloadNeeded";
import { EmptyGrid } from "./EmptyGrid";

const Grid = ({ alertStore, settingsStore, silenceFormStore }) => {
  return useObserver(() =>
    alertStore.info.upgradeNeeded ? (
      <UpgradeNeeded newVersion={alertStore.info.version} reloadAfter={3000} />
    ) : alertStore.info.reloadNeeded ? (
      <ReloadNeeded reloadAfter={4000} />
    ) : alertStore.status.error ? (
      <FatalError message={alertStore.status.error} />
    ) : alertStore.data.upstreams.counters &&
      alertStore.data.upstreams.counters.total === 1 &&
      alertStore.data.upstreams.counters.healthy === 0 &&
      alertStore.data.upstreams.instances[0] &&
      alertStore.data.upstreams.instances[0].error !== "" ? (
      <FatalError message={alertStore.data.upstreams.instances[0].error} />
    ) : alertStore.info.version !== "unknown" &&
      alertStore.info.totalAlerts === 0 ? (
      <EmptyGrid />
    ) : (
      <React.Fragment>
        {alertStore.data.upstreams.instances
          .filter((upstream) => upstream.error !== "")
          .map((upstream) => (
            <UpstreamError
              key={upstream.name}
              name={upstream.name}
              message={upstream.error}
            />
          ))}
        <AlertGrid
          alertStore={alertStore}
          settingsStore={settingsStore}
          silenceFormStore={silenceFormStore}
        />
      </React.Fragment>
    )
  );
};
Grid.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

export { Grid };

import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertGrid } from "./AlertGrid";
import { FatalError } from "./FatalError";
import { UpstreamError } from "./UpstreamError";
import { UpgradeNeeded } from "./UpgradeNeeded";
import { ReloadNeeded } from "./ReloadNeeded";
import { EmptyGrid } from "./EmptyGrid";

const Grid = observer(
  class Grid extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
    };

    render() {
      const { alertStore, settingsStore, silenceFormStore } = this.props;

      if (alertStore.info.upgradeNeeded) {
        return (
          <UpgradeNeeded
            newVersion={alertStore.info.version}
            reloadAfter={3000}
          />
        );
      }

      if (alertStore.info.reloadNeeded) {
        return <ReloadNeeded reloadAfter={4000} />;
      }

      if (alertStore.status.error) {
        return <FatalError message={alertStore.status.error} />;
      }

      if (
        alertStore.data.upstreams.counters &&
        alertStore.data.upstreams.counters.total === 1 &&
        alertStore.data.upstreams.counters.healthy === 0 &&
        alertStore.data.upstreams.instances[0] &&
        alertStore.data.upstreams.instances[0].error !== ""
      ) {
        return (
          <FatalError message={alertStore.data.upstreams.instances[0].error} />
        );
      }

      if (
        alertStore.info.version !== "unknown" &&
        alertStore.info.totalAlerts === 0
      ) {
        return <EmptyGrid />;
      }

      return (
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
      );
    }
  }
);

export { Grid };

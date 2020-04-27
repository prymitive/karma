import React from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const FetchConfiguration = ({ settingsStore }) => {
  const config = useLocalStore(() => ({
    fetchInterval: settingsStore.fetchConfig.config.interval,
    setFetchInterval(val) {
      this.fetchInterval = val;
    },
  }));

  const onChangeComplete = (value) => {
    settingsStore.fetchConfig.setInterval(value);
  };

  return useObserver(() => (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={10}
        maxValue={120}
        step={10}
        value={config.fetchInterval}
        id="formControlRange"
        formatLabel={(value) => `${value}s`}
        onChange={config.setFetchInterval}
        onChangeComplete={onChangeComplete}
      />
    </div>
  ));
};
FetchConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { FetchConfiguration };

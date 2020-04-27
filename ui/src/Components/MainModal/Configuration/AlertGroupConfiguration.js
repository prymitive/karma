import React from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupConfiguration = ({ settingsStore }) => {
  const config = useLocalStore(() => ({
    defaultRenderCount:
      settingsStore.alertGroupConfig.config.defaultRenderCount,
    setDefaultRenderCount(val) {
      this.defaultRenderCount = val;
    },
  }));

  const onChangeComplete = (value) => {
    settingsStore.alertGroupConfig.update({ defaultRenderCount: value });
  };

  return useObserver(() => (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={1}
        maxValue={10}
        step={1}
        value={config.defaultRenderCount}
        id="formControlRange"
        onChange={config.setDefaultRenderCount}
        onChangeComplete={onChangeComplete}
      />
    </div>
  ));
};
AlertGroupConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { AlertGroupConfiguration };

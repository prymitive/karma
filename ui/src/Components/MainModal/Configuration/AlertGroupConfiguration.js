import React, { useState } from "react";
import PropTypes from "prop-types";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupConfiguration = ({ settingsStore }) => {
  const [defaultRenderCount, setDefaultRenderCount] = useState(
    settingsStore.alertGroupConfig.config.defaultRenderCount
  );

  const onChangeComplete = (value) => {
    settingsStore.alertGroupConfig.setDefaultRenderCount(value);
  };

  return (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={1}
        maxValue={10}
        step={1}
        value={defaultRenderCount}
        id="formControlRange"
        onChange={setDefaultRenderCount}
        onChangeComplete={onChangeComplete}
      />
    </div>
  );
};
AlertGroupConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { AlertGroupConfiguration };

import React, { useState } from "react";
import PropTypes from "prop-types";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const FetchConfiguration = ({ settingsStore }) => {
  const [fetchInterval, setFetchInterval] = useState(
    settingsStore.fetchConfig.config.interval
  );

  const onChangeComplete = (value) => {
    settingsStore.fetchConfig.setInterval(value);
  };

  return (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={10}
        maxValue={120}
        step={10}
        value={fetchInterval}
        id="formControlRange"
        formatLabel={(value) => `${value}s`}
        onChange={setFetchInterval}
        onChangeComplete={onChangeComplete}
      />
    </div>
  );
};
FetchConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { FetchConfiguration };

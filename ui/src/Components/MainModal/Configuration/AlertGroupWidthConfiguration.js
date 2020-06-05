import React, { useState } from "react";
import PropTypes from "prop-types";

import debounce from "lodash.debounce";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupWidthConfiguration = ({ settingsStore }) => {
  const [groupWidth, setGroupWidth] = useState(
    settingsStore.gridConfig.config.groupWidth
  );

  const onChangeComplete = debounce((value) => {
    settingsStore.gridConfig.config.groupWidth = value;
  }, 200);

  return (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={300}
        maxValue={800}
        step={20}
        value={groupWidth}
        id="formControlRange"
        onChange={setGroupWidth}
        onChangeComplete={onChangeComplete}
      />
    </div>
  );
};
AlertGroupWidthConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { AlertGroupWidthConfiguration };

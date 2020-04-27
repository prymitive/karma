import React from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import debounce from "lodash/debounce";

import InputRange from "react-input-range";

import { Settings } from "Stores/Settings";

const AlertGroupWidthConfiguration = ({ settingsStore }) => {
  const config = useLocalStore(() => ({
    groupWidth: settingsStore.gridConfig.config.groupWidth,
    setGroupWidth(val) {
      this.groupWidth = val;
    },
  }));

  const onChangeComplete = debounce((value) => {
    settingsStore.gridConfig.config.groupWidth = value;
  }, 200);

  return useObserver(() => (
    <div className="form-group mb-0 text-center">
      <InputRange
        minValue={300}
        maxValue={800}
        step={20}
        value={config.groupWidth}
        id="formControlRange"
        onChange={config.setGroupWidth}
        onChangeComplete={onChangeComplete}
      />
    </div>
  ));
};
AlertGroupWidthConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { AlertGroupWidthConfiguration };

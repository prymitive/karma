import React from "react";
import PropTypes from "prop-types";

import Creatable from "react-select/creatable";

import { useFetchGet } from "Hooks/useFetchGet";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const disabledLabel = "Disable multi-grid";
const emptyValue = { label: disabledLabel, value: "" };
const valueToOption = (v) => ({ label: v ? v : disabledLabel, value: v });

const GridLabelName = ({ settingsStore }) => {
  const { response } = useFetchGet(FormatBackendURI(`labelNames.json`));

  const context = React.useContext(ThemeContext);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId="configuration-grid-label"
      defaultValue={valueToOption(
        settingsStore.multiGridConfig.config.gridLabel
      )}
      options={
        response
          ? [
              ...[emptyValue],
              ...response.map((value) => ({
                label: value,
                value: value,
              })),
            ]
          : [emptyValue]
      }
      onChange={({ value }) => {
        settingsStore.multiGridConfig.config.gridLabel = value;
      }}
    />
  );
};
GridLabelName.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { GridLabelName };

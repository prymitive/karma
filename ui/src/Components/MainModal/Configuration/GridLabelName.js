import React from "react";
import PropTypes from "prop-types";

import Creatable from "react-select/creatable";

import { useFetchGet } from "Hooks/useFetchGet";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { NewLabelName } from "Common/Select";

const disabledLabel = "Disable multi-grid";

const valueToOption = (v) => ({ label: v ? v : disabledLabel, value: v });

const staticValues = [
  { label: disabledLabel, value: "" },
  { label: "@alertmanager", value: "@alertmanager" },
  { label: "@cluster", value: "@cluster" },
  { label: "@receiver", value: "@receiver" },
];

const GridLabelName = ({ settingsStore }) => {
  const { response } = useFetchGet(FormatBackendURI(`labelNames.json`));

  const context = React.useContext(ThemeContext);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId="configuration-grid-label"
      formatCreateLabel={NewLabelName}
      defaultValue={valueToOption(
        settingsStore.multiGridConfig.config.gridLabel
      )}
      options={
        response
          ? [
              ...staticValues,
              ...response.map((value) => ({
                label: value,
                value: value,
              })),
            ]
          : staticValues
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

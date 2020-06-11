import React from "react";
import PropTypes from "prop-types";

import Creatable from "react-select/creatable";

import { StaticLabels } from "Common/Query";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { useFetchGet } from "Hooks/useFetchGet";
import { ThemeContext } from "Components/Theme";
import { NewLabelName } from "Common/Select";

const valueToOption = (v) => ({ label: v, value: v });

const SortLabelName = ({ settingsStore }) => {
  const { response } = useFetchGet(FormatBackendURI(`labelNames.json`));

  if (!settingsStore.gridConfig.config.sortLabel) {
    settingsStore.gridConfig.config.sortLabel = StaticLabels.AlertName;
  }

  const context = React.useContext(ThemeContext);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId="configuration-sort-label"
      formatCreateLabel={NewLabelName}
      defaultValue={valueToOption(settingsStore.gridConfig.config.sortLabel)}
      options={
        response
          ? response.map((value) => ({
              label: value,
              value: value,
            }))
          : []
      }
      onChange={({ value }) => {
        settingsStore.gridConfig.config.sortLabel = value;
      }}
    />
  );
};
SortLabelName.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { SortLabelName };

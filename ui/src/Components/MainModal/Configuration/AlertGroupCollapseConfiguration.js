import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import Select from "react-select";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const AlertGroupCollapseConfiguration = ({ settingsStore }) => {
  if (
    !Object.values(settingsStore.alertGroupConfig.options)
      .map((o) => o.value)
      .includes(settingsStore.alertGroupConfig.config.defaultCollapseState)
  ) {
    settingsStore.alertGroupConfig.config.defaultCollapseState =
      settingsStore.alertGroupConfig.options.collapsedOnMobile.value;
  }

  const valueToOption = (val) => {
    return {
      label: settingsStore.alertGroupConfig.options[val].label,
      value: val,
    };
  };

  const onCollapseChange = (newValue, actionMeta) => {
    settingsStore.alertGroupConfig.config.defaultCollapseState = newValue.value;
  };

  const context = React.useContext(ThemeContext);

  return useObserver(() => (
    <div className="form-group mb-0">
      <Select
        styles={context.reactSelectStyles}
        classNamePrefix="react-select"
        instanceId="configuration-collapse"
        defaultValue={valueToOption(
          settingsStore.alertGroupConfig.config.defaultCollapseState
        )}
        options={Object.values(settingsStore.alertGroupConfig.options)}
        onChange={onCollapseChange}
        hideSelectedOptions
      />
    </div>
  ));
};
AlertGroupCollapseConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { AlertGroupCollapseConfiguration };

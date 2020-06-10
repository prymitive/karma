import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import Select from "react-select";

import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const ThemeConfiguration = ({ settingsStore }) => {
  if (
    !Object.values(settingsStore.themeConfig.options)
      .map((o) => o.value)
      .includes(settingsStore.themeConfig.config.theme)
  ) {
    settingsStore.themeConfig.config.theme =
      settingsStore.themeConfig.options.auto.value;
  }

  const valueToOption = (val) => {
    return {
      label: settingsStore.themeConfig.options[val].label,
      value: val,
    };
  };

  const onCollapseChange = (newValue, actionMeta) => {
    settingsStore.themeConfig.config.theme = newValue.value;
  };

  const context = React.useContext(ThemeContext);

  return useObserver(() => (
    <div className="form-group mb-2">
      <Select
        styles={context.reactSelectStyles}
        classNamePrefix="react-select"
        instanceId="configuration-theme"
        defaultValue={valueToOption(settingsStore.themeConfig.config.theme)}
        options={Object.values(settingsStore.themeConfig.options)}
        onChange={onCollapseChange}
        hideSelectedOptions
      />
    </div>
  ));
};
ThemeConfiguration.propTypes = {
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
};

export { ThemeConfiguration };

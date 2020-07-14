import React, { FC } from "react";

import { useObserver } from "mobx-react-lite";

import Select from "react-select";

import { OptionT } from "Common/Select";
import { Settings, ThemeT } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const ThemeConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  if (
    !Object.values(settingsStore.themeConfig.options)
      .map((o) => o.value)
      .includes(settingsStore.themeConfig.config.theme)
  ) {
    settingsStore.themeConfig.config.theme = "auto";
  }

  const valueToOption = (val: ThemeT) => {
    return {
      label: settingsStore.themeConfig.options[val].label,
      value: val,
    };
  };

  const onCollapseChange = (newValue: ThemeT) => {
    settingsStore.themeConfig.config.theme = newValue;
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
        onChange={(option) =>
          onCollapseChange((option as OptionT).value as ThemeT)
        }
        hideSelectedOptions
      />
    </div>
  ));
};

export { ThemeConfiguration };

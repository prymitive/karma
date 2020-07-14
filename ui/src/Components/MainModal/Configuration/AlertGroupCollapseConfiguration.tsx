import React, { FC } from "react";

import { useObserver } from "mobx-react-lite";

import Select from "react-select";

import { OptionT } from "Common/Select";
import { Settings, CollapseStateT } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";

const AlertGroupCollapseConfiguration: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  if (
    !Object.values(settingsStore.alertGroupConfig.options)
      .map((o) => o.value)
      .includes(settingsStore.alertGroupConfig.config.defaultCollapseState)
  ) {
    settingsStore.alertGroupConfig.config.defaultCollapseState =
      "collapsedOnMobile";
  }

  const valueToOption = (val: CollapseStateT): OptionT => {
    return {
      label: settingsStore.alertGroupConfig.options[val].label,
      value: val,
    };
  };

  const onCollapseChange = (newValue: CollapseStateT) => {
    settingsStore.alertGroupConfig.config.defaultCollapseState = newValue;
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
        onChange={(option) =>
          onCollapseChange((option as OptionT).value as CollapseStateT)
        }
        hideSelectedOptions
      />
    </div>
  ));
};

export { AlertGroupCollapseConfiguration };

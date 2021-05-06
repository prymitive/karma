import React, { FC } from "react";

import { observer } from "mobx-react-lite";

import Select from "react-select";

import { OptionT } from "Common/Select";
import { Settings, CollapseStateT } from "Stores/Settings";
import { AnimatedMenu } from "Components/Select";
import { ThemeContext } from "Components/Theme";

const AlertGroupCollapseConfiguration: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  if (
    !Object.values(settingsStore.alertGroupConfig.options)
      .map((o) => o.value)
      .includes(settingsStore.alertGroupConfig.config.defaultCollapseState)
  ) {
    settingsStore.alertGroupConfig.setDefaultCollapseState("collapsedOnMobile");
  }

  const valueToOption = (val: CollapseStateT): OptionT => {
    return {
      label: settingsStore.alertGroupConfig.options[val].label,
      value: val,
    };
  };

  const onCollapseChange = (newValue: CollapseStateT) => {
    settingsStore.alertGroupConfig.setDefaultCollapseState(newValue);
  };

  const context = React.useContext(ThemeContext);

  return (
    <div className="mb-0">
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
        components={{ Menu: AnimatedMenu }}
      />
    </div>
  );
});

export { AlertGroupCollapseConfiguration };

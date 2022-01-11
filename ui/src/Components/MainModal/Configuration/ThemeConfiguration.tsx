import React, { FC } from "react";

import { observer } from "mobx-react-lite";

import Select, { OnChangeValue } from "react-select";

import type { OptionT } from "Common/Select";
import type { Settings, ThemeT } from "Stores/Settings";
import { AnimatedMenu } from "Components/Select";
import { ThemeContext } from "Components/Theme";

const ThemeConfiguration: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  if (
    !Object.values(settingsStore.themeConfig.options)
      .map((o) => o.value)
      .includes(settingsStore.themeConfig.config.theme)
  ) {
    settingsStore.themeConfig.setTheme("auto");
  }

  const valueToOption = (val: ThemeT): OptionT => {
    return {
      label: settingsStore.themeConfig.options[val].label,
      value: val,
      wasCreated: false,
    };
  };

  const onChange = (newValue: ThemeT) => {
    settingsStore.themeConfig.setTheme(newValue);
  };

  const context = React.useContext(ThemeContext);

  return (
    <div className="mb-2">
      <Select
        styles={context.reactSelectStyles}
        classNamePrefix="react-select"
        instanceId="configuration-theme"
        defaultValue={valueToOption(settingsStore.themeConfig.config.theme)}
        options={Object.values(settingsStore.themeConfig.options) as OptionT[]}
        onChange={(option: OnChangeValue<OptionT, false>) =>
          onChange((option as OptionT).value as ThemeT)
        }
        hideSelectedOptions
        components={{
          Menu: AnimatedMenu,
        }}
      />
    </div>
  );
});

export { ThemeConfiguration };

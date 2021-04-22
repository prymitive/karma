import React, { FC } from "react";

import Creatable from "react-select/creatable";

import { useFetchGet } from "Hooks/useFetchGet";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { AnimatedMenu } from "Components/Select";
import { NewLabelName, StringToOption, OptionT } from "Common/Select";

const disabledLabel = "Disable multi-grid";

const valueToOption = (v: string) => ({
  label: v ? v : disabledLabel,
  value: v,
});

const staticValues = [
  { label: disabledLabel, value: "" },
  { label: "Automatic selection", value: "@auto" },
  { label: "@alertmanager", value: "@alertmanager" },
  { label: "@cluster", value: "@cluster" },
  { label: "@receiver", value: "@receiver" },
];

const GridLabelName: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const { response } = useFetchGet<string[]>(
    FormatBackendURI(`labelNames.json`)
  );

  const context = React.useContext(ThemeContext);

  const defaultValue =
    settingsStore.multiGridConfig.config.gridLabel === "@auto"
      ? { label: "Automatic selection", value: "@auto" }
      : valueToOption(settingsStore.multiGridConfig.config.gridLabel);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId="configuration-grid-label"
      formatCreateLabel={NewLabelName}
      defaultValue={defaultValue}
      options={
        response
          ? [
              ...staticValues,
              ...response.map((value: string) => StringToOption(value)),
            ]
          : staticValues
      }
      onChange={(option) => {
        settingsStore.multiGridConfig.setGridLabel((option as OptionT).value);
      }}
      components={{ Menu: AnimatedMenu }}
    />
  );
};

export { GridLabelName };

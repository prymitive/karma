import React, { FC } from "react";

import Creatable from "react-select/creatable";
import { GroupTypeBase, SelectComponentsConfig } from "react-select";

import { useFetchGet } from "Hooks/useFetchGet";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { ThemeContext } from "Components/Theme";
import { NewLabelName, StringToOption, OptionT } from "Common/Select";

const disabledLabel = "Disable multi-grid";

const valueToOption = (v: string) => ({
  label: v ? v : disabledLabel,
  value: v,
});

const staticValues = [
  { label: disabledLabel, value: "" },
  { label: "@alertmanager", value: "@alertmanager" },
  { label: "@cluster", value: "@cluster" },
  { label: "@receiver", value: "@receiver" },
];

const GridLabelName: FC<{
  settingsStore: Settings;
  isOpen?: boolean | undefined;
  selectComponents?:
    | Partial<SelectComponentsConfig<OptionT, false, GroupTypeBase<OptionT>>>
    | undefined;
}> = ({ settingsStore, isOpen = undefined, selectComponents = undefined }) => {
  const { response } = useFetchGet<string[]>(
    FormatBackendURI(`labelNames.json`)
  );

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
              ...response.map((value: string) => StringToOption(value)),
            ]
          : staticValues
      }
      onChange={(option) => {
        settingsStore.multiGridConfig.config.gridLabel = (option as OptionT).value;
      }}
      menuIsOpen={isOpen}
      components={selectComponents}
    />
  );
};

export { GridLabelName };

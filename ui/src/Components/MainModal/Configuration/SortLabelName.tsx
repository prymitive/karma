import React, { FC } from "react";

import Creatable from "react-select/creatable";

import { StaticLabels } from "Common/Query";
import { OptionT } from "Common/Select";
import { FormatBackendURI } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { useFetchGet } from "Hooks/useFetchGet";
import { ThemeContext } from "Components/Theme";
import { AnimatedMenu } from "Components/Select";
import { NewLabelName, StringToOption } from "Common/Select";

const SortLabelName: FC<{
  settingsStore: Settings;
}> = ({ settingsStore }) => {
  const { response } = useFetchGet<string[]>(
    FormatBackendURI(`labelNames.json`)
  );

  if (!settingsStore.gridConfig.config.sortLabel) {
    settingsStore.gridConfig.setSortLabel(StaticLabels.AlertName);
  }

  const context = React.useContext(ThemeContext);

  return (
    <Creatable
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId="configuration-sort-label"
      formatCreateLabel={NewLabelName}
      defaultValue={StringToOption(
        settingsStore.gridConfig.config.sortLabel as string
      )}
      options={
        response ? response.map((value: string) => StringToOption(value)) : []
      }
      onChange={(option) => {
        settingsStore.gridConfig.setSortLabel(
          (option as OptionT).value as string
        );
      }}
      components={{ Menu: AnimatedMenu }}
    />
  );
};

export { SortLabelName };

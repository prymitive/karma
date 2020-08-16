import React, { FC, Ref, useEffect, useState } from "react";

import { autorun } from "mobx";
import { useObserver } from "mobx-react-lite";

import useDimensions from "react-cool-dimensions";

import { SizeDetail } from "bricks.js";

import { useHotkeys } from "react-hotkeys-hook";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { useWindowSize } from "Hooks/useWindowSize";
import { Grid } from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const AlertGrid: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
}> = ({ alertStore, settingsStore, silenceFormStore }) => {
  const { width: windowWidth } = useWindowSize();
  const { ref, width: bodyWidth } = useDimensions();

  const [gridSizesConfig, setGridSizesConfig] = useState<SizeDetail[]>(
    GridSizesConfig(settingsStore.gridConfig.config.groupWidth)
  );
  const [groupWidth, setGroupWidth] = useState<number>(
    GetGridElementWidth(
      bodyWidth || document.body.clientWidth,
      windowWidth,
      alertStore.data.gridPadding * 2,
      settingsStore.gridConfig.config.groupWidth
    )
  );

  useEffect(
    () =>
      autorun(() => {
        setGridSizesConfig(
          GridSizesConfig(settingsStore.gridConfig.config.groupWidth)
        );
        setGroupWidth(
          GetGridElementWidth(
            bodyWidth || document.body.clientWidth,
            windowWidth,
            alertStore.data.gridPadding * 2,
            settingsStore.gridConfig.config.groupWidth
          )
        );
      }),
    [windowWidth, bodyWidth] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useHotkeys("alt+space", alertStore.status.togglePause);

  return useObserver(() => (
    <React.Fragment>
      <div ref={ref as Ref<HTMLDivElement>} />
      {alertStore.data.grids.map((grid) => (
        <Grid
          key={`${grid.labelName}/${grid.labelValue}`}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={gridSizesConfig}
          groupWidth={groupWidth}
          grid={grid}
          outerPadding={alertStore.data.gridPadding}
        />
      ))}
    </React.Fragment>
  ));
};

export { AlertGrid };

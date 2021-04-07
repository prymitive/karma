import { FC, useEffect, useState, useRef } from "react";

import { autorun } from "mobx";
import { observer } from "mobx-react-lite";

import useDimensions from "react-cool-dimensions";

import { SizeDetail } from "bricks.js";

import { useHotkeys } from "react-hotkeys-hook";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { useWindowSize } from "Hooks/useWindowSize";
import Grid from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const AlertGrid: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
}> = ({ alertStore, settingsStore, silenceFormStore }) => {
  const ref = useRef<HTMLDivElement>();
  const { width: windowWidth } = useWindowSize();
  const { observe, width: bodyWidth } = useDimensions();

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

  return (
    <>
      <div
        ref={(el) => {
          observe(el as HTMLElement);
          ref.current = el as HTMLDivElement;
        }}
      />
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
    </>
  );
};

export default observer(AlertGrid);

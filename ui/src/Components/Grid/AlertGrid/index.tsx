import { FC, useEffect, useEffectEvent, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { useHotkeys } from "react-hotkeys-hook";

import type { AlertStore } from "Stores/AlertStore";
import type { Settings } from "Stores/Settings";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import { useWindowSize } from "Hooks/useWindowSize";
import { useElementSize } from "Hooks/useElementSize";
import Grid from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const AlertGrid: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
}> = ({ alertStore, settingsStore, silenceFormStore }) => {
  const { width: windowWidth } = useWindowSize();
  const { ref: bodySizeRef, width: bodyWidth } = useElementSize();

  const configuredGroupWidth = settingsStore.gridConfig.config.groupWidth;
  const gridSizesConfig = useMemo(
    () => GridSizesConfig(configuredGroupWidth),
    [configuredGroupWidth],
  );
  const groupWidth = GetGridElementWidth(
    bodyWidth || document.body.clientWidth,
    windowWidth,
    alertStore.data.gridPadding * 2,
    configuredGroupWidth,
  );

  useHotkeys("alt+space", alertStore.status.togglePause);

  const [paddingTop, setPaddingTop] = useState<number>(0);
  const onNavbarResize = useEffectEvent((event: Event) => {
    setPaddingTop((event as CustomEvent).detail);
  });
  useEffect(() => {
    window.addEventListener("navbarResize", onNavbarResize);
    return () => {
      window.removeEventListener("navbarResize", onNavbarResize);
    };
  }, [onNavbarResize]);

  return (
    <>
      <div ref={bodySizeRef} />
      {alertStore.data.grids.map((grid, index) => (
        <Grid
          key={`${grid.labelName}/${grid.labelValue}`}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={gridSizesConfig}
          groupWidth={groupWidth}
          grid={grid}
          outerPadding={alertStore.data.gridPadding}
          paddingTop={paddingTop}
          zIndex={100 + alertStore.data.grids.length - index}
        />
      ))}
    </>
  );
};

export default observer(AlertGrid);

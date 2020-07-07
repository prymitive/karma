import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { autorun } from "mobx";
import { useObserver } from "mobx-react-lite";

import useDimensions from "react-cool-dimensions";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { useWindowSize } from "Hooks/useWindowSize";
import { Grid } from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const AlertGrid = ({ alertStore, settingsStore, silenceFormStore }) => {
  const { width: windowWidth } = useWindowSize();
  const { ref, width: bodyWidth } = useDimensions();

  const [gridSizesConfig, setGridSizesConfig] = useState(
    GridSizesConfig(windowWidth, settingsStore.gridConfig.config.groupWidth)
  );
  const [groupWidth, setGroupWidth] = useState(
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
          GridSizesConfig(
            windowWidth,
            settingsStore.gridConfig.config.groupWidth
          )
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

  return useObserver(() => (
    <React.Fragment>
      <div ref={ref} />
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
AlertGrid.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

export { AlertGrid };

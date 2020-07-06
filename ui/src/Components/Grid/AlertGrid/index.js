import React, { useState } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import useDimensions from "react-cool-dimensions";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Grid } from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const AlertGrid = ({ alertStore, settingsStore, silenceFormStore }) => {
  const getGridSizesConfig = (windowWidth) =>
    GridSizesConfig(windowWidth, settingsStore.gridConfig.config.groupWidth);

  const getGroupWidth = (canvasWidth, windowWidth) =>
    GetGridElementWidth(
      canvasWidth,
      windowWidth,
      alertStore.data.gridPadding * 2,
      settingsStore.gridConfig.config.groupWidth
    );

  const [gridSizesConfig, setGridSizesConfig] = useState(
    getGridSizesConfig(window.innerWidth)
  );
  const [groupWidth, setGroupWidth] = useState(
    getGroupWidth(document.body.clientWidth, window.innerWidth)
  );

  const handleResize = ({ width }) => {
    setGridSizesConfig(getGridSizesConfig(window.innerWidth));
    setGroupWidth(getGroupWidth(width, window.innerWidth));
  };

  const { ref } = useDimensions({
    onResize: handleResize,
  });

  return useObserver(() => (
    <React.Fragment>
      <div ref={ref}></div>
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

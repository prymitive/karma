import React, { useEffect, useCallback, useState } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import debounce from "lodash.debounce";

import ReactResizeDetector from "react-resize-detector";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Grid } from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const GridPadding = 5;

const AlertGrid = ({ alertStore, settingsStore, silenceFormStore }) => {
  const getGridSizesConfig = (windowWidth) =>
    GridSizesConfig(windowWidth, settingsStore.gridConfig.config.groupWidth);

  const getGroupWidth = (canvasWidth, windowWidth) =>
    GetGridElementWidth(
      canvasWidth,
      windowWidth,
      alertStore.data.grids.filter((g) => g.labelName !== "").length > 0
        ? GridPadding * 2
        : 0,
      settingsStore.gridConfig.config.groupWidth
    );

  const [gridSizesConfig, setGridSizesConfig] = useState(
    getGridSizesConfig(window.innerWidth)
  );
  const [groupWidth, setGroupWidth] = useState(
    getGroupWidth(document.body.clientWidth, window.innerWidth)
  );

  const handleResize = useCallback(
    debounce(() => {
      setGridSizesConfig(getGridSizesConfig(window.innerWidth));
      setGroupWidth(
        getGroupWidth(document.body.clientWidth, window.innerWidth)
      );
    }, 100),
    []
  );

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      handleResize.cancel();
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  return useObserver(() => (
    <React.Fragment>
      <ReactResizeDetector handleWidth handleHeight onResize={handleResize} />
      {alertStore.data.grids.map((grid) => (
        <Grid
          key={`${grid.labelName}/${grid.labelValue}`}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          gridSizesConfig={gridSizesConfig}
          groupWidth={groupWidth}
          grid={grid}
          outerPadding={grid.labelName !== "" ? GridPadding : 0}
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

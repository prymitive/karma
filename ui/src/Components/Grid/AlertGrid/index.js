import React, { useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import { useLocalStore, useObserver } from "mobx-react";

import debounce from "lodash.debounce";

import ReactResizeDetector from "react-resize-detector";

import { AnimatePresence } from "framer-motion";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Grid } from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const GridPadding = 5;

const AlertGrid = ({ alertStore, settingsStore, silenceFormStore }) => {
  // this is used to track viewport width, when browser window is resized
  // we need to recreate the entire grid object to apply new column count
  // and group size
  const viewport = useLocalStore(() => ({
    canvasWidth: document.body.clientWidth,
    windowWidth: window.innerWidth,
    updateWidths(canvasWidth, windowWidth) {
      this.canvasWidth = canvasWidth;
      this.windowWidth = windowWidth;
    },
    get gridSizesConfig() {
      return GridSizesConfig(
        this.windowWidth,
        settingsStore.gridConfig.config.groupWidth
      );
    },
    get groupWidth() {
      return GetGridElementWidth(
        this.canvasWidth,
        this.windowWidth,
        alertStore.data.grids.filter((g) => g.labelName !== "").length > 0
          ? GridPadding * 2
          : 0,
        settingsStore.gridConfig.config.groupWidth
      );
    },
  }));

  const handleResize = useCallback(
    debounce(() => {
      viewport.updateWidths(document.body.clientWidth, window.innerWidth);
    }, 100),
    [viewport]
  );

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  return useObserver(() => (
    <React.Fragment>
      <ReactResizeDetector handleWidth handleHeight onResize={handleResize} />
      <AnimatePresence>
        {alertStore.data.grids.map((grid) => (
          <Grid
            key={`${grid.labelName}/${grid.labelValue}`}
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
            settingsStore={settingsStore}
            gridSizesConfig={viewport.gridSizesConfig}
            groupWidth={viewport.groupWidth}
            grid={grid}
            outerPadding={grid.labelName !== "" ? GridPadding : 0}
          />
        ))}
      </AnimatePresence>
    </React.Fragment>
  ));
};
AlertGrid.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

export { AlertGrid };

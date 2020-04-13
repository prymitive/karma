import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, computed } from "mobx";
import { observer } from "mobx-react";

import debounce from "lodash/debounce";

import ReactResizeDetector from "react-resize-detector";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Grid } from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

const GridPadding = 5;

const AlertGrid = observer(
  class AlertGrid extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
    };

    constructor(props) {
      super(props);

      // this is used to track viewport width, when browser window is resized
      // we need to recreate the entire grid object to apply new column count
      // and group size
      this.viewport = observable(
        {
          canvasWidth: document.body.clientWidth,
          windowWidth: window.innerWidth,
          updateWidths(canvasWidth, windowWidth) {
            this.canvasWidth = canvasWidth;
            this.windowWidth = windowWidth;
          },
          get gridSizesConfig() {
            return GridSizesConfig(
              this.windowWidth,
              props.settingsStore.gridConfig.config.groupWidth
            );
          },
          get groupWidth() {
            return GetGridElementWidth(
              this.canvasWidth,
              this.windowWidth,
              props.alertStore.data.grids.filter((g) => g.labelName !== "")
                .length > 0
                ? GridPadding * 2
                : 0,
              props.settingsStore.gridConfig.config.groupWidth
            );
          },
        },
        {
          updateWidths: action.bound,
          gridSizesConfig: computed,
          groupWidth: computed,
        }
      );
    }

    handleResize = debounce(() => {
      this.viewport.updateWidths(document.body.clientWidth, window.innerWidth);
    }, 100);

    componentDidMount() {
      window.addEventListener("resize", this.handleResize);
    }

    componentWillUnmount() {
      window.removeEventListener("resize", this.handleResize);
    }

    render() {
      const { alertStore, settingsStore, silenceFormStore } = this.props;

      return (
        <React.Fragment>
          <ReactResizeDetector
            handleWidth
            handleHeight
            onResize={debounce(this.handleResize, 100)}
          />
          {alertStore.data.grids.map((grid) => (
            <Grid
              key={`${grid.labelName}/${grid.labelValue}`}
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              settingsStore={settingsStore}
              gridSizesConfig={this.viewport.gridSizesConfig}
              groupWidth={this.viewport.groupWidth}
              grid={grid}
              outerPadding={grid.labelName !== "" ? GridPadding : 0}
            />
          ))}
        </React.Fragment>
      );
    }
  }
);

export { AlertGrid };

import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, computed } from "mobx";
import { observer } from "mobx-react";

import FontFaceObserver from "fontfaceobserver";

import debounce from "lodash/debounce";

import ReactResizeDetector from "react-resize-detector";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Grid } from "./Grid";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

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
      // We have font-display:swap set for font assets, this means that on initial
      // render a fallback font might be used and later swapped for the final one
      // (once the final font is loaded). This means that fallback font might
      // render to a different size and the swap can result in component resize.
      // For our grid this resize might leave gaps since everything uses fixed
      // position, so we use font observer and trigger repack when fonts are loaded
      for (const fontWeight of [300, 400, 600]) {
        const font = new FontFaceObserver("Open Sans", {
          weight: fontWeight,
        });
        // wait up to 30s, run no-op function on timeout
        font.load(null, 30000).then(this.masonryRepack, () => {});
      }

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
              gridLabelName={grid.labelName}
              gridLabelValue={grid.labelValue}
              gridAlertGroups={grid.alertGroups}
            />
          ))}
        </React.Fragment>
      );
    }
  }
);

export { AlertGrid };

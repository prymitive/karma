import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, computed } from "mobx";
import { observer } from "mobx-react";

import FontFaceObserver from "fontfaceobserver";

import { debounce, throttle } from "lodash";

import ReactResizeDetector from "react-resize-detector";

import MasonryInfiniteScroller from "react-masonry-infinite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertGroup } from "./AlertGroup";
import { GridSizesConfig, GetGridElementWidth } from "./GridSize";

import "./index.css";

const AlertGrid = observer(
  class AlertGrid extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
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
          }
        },
        {
          updateWidths: action.bound,
          gridSizesConfig: computed,
          groupWidth: computed
        }
      );
    }

    handleResize = debounce(() => {
      this.viewport.updateWidths(document.body.clientWidth, window.innerWidth);
    }, 100);

    // store reference to generated masonry component so we can call it
    // to repack the grid after any component was re-rendered, which could
    // alter its size breaking grid layout
    masonryComponentReference = observable(
      { ref: false },
      {},
      { name: "Masonry reference" }
    );
    // store it for later
    storeMasonryRef = action(ref => {
      this.masonryComponentReference.ref = ref;
    });
    // used to call forcePack() which will repack all grid elements
    // (alert groups), this needs to be called if any group size changes
    masonryRepack = debounce(
      action(() => {
        if (this.masonryComponentReference.ref) {
          this.masonryComponentReference.ref.forcePack();
        }
      }),
      10
    );

    loadMore = action(() => {
      const { alertStore } = this.props;

      alertStore.groupLimit.value = Math.min(
        alertStore.groupLimit.value + alertStore.groupLimit.step,
        alertStore.info.totalGroups
      );
    });

    componentDidMount() {
      // We have font-display:swap set for font assets, this means that on initial
      // render a fallback font might be used and later swapped for the final one
      // (once the final font is loaded). This means that fallback font might
      // render to a different size and the swap can result in component resize.
      // For our grid this resize might leave gaps since everything uses fixed
      // position, so we use font observer and trigger repack when fonts are loaded
      for (const fontWeight of [300, 400, 600]) {
        const font = new FontFaceObserver("Open Sans", {
          weight: fontWeight
        });
        // wait up to 30s, run no-op function on timeout
        font.load(null, 30000).then(this.masonryRepack, () => {});
      }

      window.addEventListener("resize", this.handleResize);
    }

    componentDidUpdate() {
      const { alertStore } = this.props;

      if (this.groupsToRender.value > alertStore.data.groups.length) {
        this.groupsToRender.setValue(
          Math.max(this.initial, alertStore.data.groups.length)
        );
      }
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
          <MasonryInfiniteScroller
            key={settingsStore.gridConfig.config.groupWidth}
            ref={this.storeMasonryRef}
            position={false}
            pack={true}
            sizes={this.viewport.gridSizesConfig}
            initialLoad={false}
            loadMore={throttle(this.loadMore, 500)}
            hasMore={alertStore.groupLimit.value < alertStore.info.totalGroups}
            threshold={50}
            loader={
              <div key="loader" className="text-center text-muted py-3">
                <FontAwesomeIcon icon={faCircleNotch} size="lg" spin />
              </div>
            }
          >
            {alertStore.data.groups.map(group => (
              <AlertGroup
                key={group.id}
                group={group}
                showAlertmanagers={
                  Object.keys(alertStore.data.upstreams.clusters).length > 1
                }
                afterUpdate={this.masonryRepack}
                alertStore={alertStore}
                settingsStore={settingsStore}
                silenceFormStore={silenceFormStore}
                style={{
                  width: this.viewport.groupWidth
                }}
              />
            ))}
          </MasonryInfiniteScroller>
        </React.Fragment>
      );
    }
  }
);

export { AlertGrid };

import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import debounce from "lodash/debounce";

import { Fade } from "react-reveal";

import FontFaceObserver from "fontfaceobserver";

import MasonryInfiniteScroller from "react-masonry-infinite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTh } from "@fortawesome/free-solid-svg-icons/faTh";
import { faAngleDoubleDown } from "@fortawesome/free-solid-svg-icons/faAngleDoubleDown";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { APIGrid } from "Models/API";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ThemeContext } from "Components/Theme";
import { ToggleIcon } from "Components/ToggleIcon";
import { DefaultDetailsCollapseValue } from "./AlertGroup/DetailsToggle";
import { AlertGroup } from "./AlertGroup";

const Grid = observer(
  class Grid extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      gridSizesConfig: PropTypes.array.isRequired,
      groupWidth: PropTypes.number.isRequired,
      grid: APIGrid.isRequired,
      outerPadding: PropTypes.number.isRequired,
    };

    // store reference to generated masonry component so we can call it
    // to repack the grid after any component was re-rendered, which could
    // alter its size breaking grid layout
    masonryComponentReference = observable(
      { ref: false },
      {},
      { name: "Masonry reference" }
    );
    // store it for later
    storeMasonryRef = action((ref) => {
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

    initial = 50;
    groupsToRender = observable(
      {
        value: this.initial,
        setValue(value) {
          this.value = value;
        },
      },
      {
        setValue: action.bound,
      },
      { name: "Groups to render" }
    );
    // how many groups add to render count when user scrolls to the bottom
    loadMoreStep = 30;

    loadMore = action(() => {
      const { grid } = this.props;

      this.groupsToRender.value = Math.min(
        this.groupsToRender.value + this.loadMoreStep,
        grid.alertGroups.length
      );
    });

    constructor(props) {
      super(props);

      const { settingsStore } = props;

      this.gridToggle = observable(
        {
          show: !DefaultDetailsCollapseValue(settingsStore),
          toggle() {
            this.show = !this.show;
          },
          set(value) {
            this.show = value;
          },
        },
        {
          toggle: action.bound,
          set: action.bound,
        }
      );
    }

    onCollapseClick = (event) => {
      // left click       => toggle current grid
      // left click + alt => toggle all grids

      this.gridToggle.toggle();

      if (event.altKey === true) {
        const toggleEvent = new CustomEvent("alertGridCollapse", {
          detail: this.gridToggle.show,
        });
        window.dispatchEvent(toggleEvent);
      }
    };

    onAlertGridCollapseEvent = (event) => {
      this.gridToggle.set(event.detail);
    };

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

      window.addEventListener(
        "alertGridCollapse",
        this.onAlertGridCollapseEvent
      );
    }

    componentDidUpdate() {
      const { grid } = this.props;

      this.masonryRepack();

      if (this.groupsToRender.value > grid.alertGroups.length) {
        this.groupsToRender.setValue(
          Math.max(this.initial, grid.alertGroups.length)
        );
      }
    }

    componentWillUnmount() {
      window.removeEventListener(
        "alertGridCollapse",
        this.onAlertGridCollapseEvent
      );
    }

    render() {
      const {
        alertStore,
        settingsStore,
        silenceFormStore,
        gridSizesConfig,
        groupWidth,
        grid,
        outerPadding,
      } = this.props;

      return (
        <React.Fragment>
          {grid.labelName !== "" && (
            <Fade
              in={this.context.animations.in}
              duration={this.context.animations.duration}
            >
              <h5 className="components-grid-swimlane d-flex flex-row justify-content-between rounded px-2 py-1 mt-2 mb-0 border border-dark">
                <span
                  className="flex-shrink-1 flex-grow-1"
                  style={{ minWidth: "0px" }}
                >
                  <span className="badge components-label px-0 ml-0 mr-3">
                    <FontAwesomeIcon icon={faTh} className="text-muted" />
                  </span>
                  {grid.labelName !== "" && grid.labelValue !== "" && (
                    <FilteringLabel
                      key={grid.labelValue}
                      name={grid.labelName}
                      value={grid.labelValue}
                      alertStore={alertStore}
                    />
                  )}
                </span>
                <span className="flex-shrink-0 flex-grow-0 ml-2 mr-0">
                  <FilteringCounterBadge
                    name="@state"
                    value="unprocessed"
                    counter={grid.stateCount.unprocessed}
                    themed={true}
                    alertStore={alertStore}
                  />
                  <FilteringCounterBadge
                    name="@state"
                    value="suppressed"
                    counter={grid.stateCount.suppressed}
                    themed={true}
                    alertStore={alertStore}
                  />
                  <FilteringCounterBadge
                    name="@state"
                    value="active"
                    counter={grid.stateCount.active}
                    themed={true}
                    alertStore={alertStore}
                  />
                  <span
                    className="text-muted cursor-pointer badge px-0 components-label ml-2 mr-0"
                    onClick={this.onCollapseClick}
                  >
                    <TooltipWrapper title="Click to toggle this grid details or Alt+Click to toggle all grids">
                      <ToggleIcon isOpen={this.gridToggle.show} />
                    </TooltipWrapper>
                  </span>
                </span>
              </h5>
            </Fade>
          )}
          <MasonryInfiniteScroller
            key={settingsStore.gridConfig.config.groupWidth}
            ref={this.storeMasonryRef}
            position={false}
            pack={true}
            sizes={gridSizesConfig}
            loadMore={this.loadMore}
            hasMore={false}
            style={{
              paddingLeft: `${outerPadding}px`,
              paddingRight: `${outerPadding}px`,
            }}
          >
            {this.gridToggle.show || grid.labelName === ""
              ? grid.alertGroups
                  .slice(0, this.groupsToRender.value)
                  .map((group) => (
                    <AlertGroup
                      key={group.id}
                      group={group}
                      showAlertmanagers={
                        Object.keys(alertStore.data.upstreams.clusters).length >
                        1
                      }
                      afterUpdate={this.masonryRepack}
                      alertStore={alertStore}
                      settingsStore={settingsStore}
                      silenceFormStore={silenceFormStore}
                      style={{
                        width: groupWidth,
                      }}
                      gridLabelValue={grid.labelValue}
                    />
                  ))
              : []}
          </MasonryInfiniteScroller>
          {this.gridToggle.show &&
            grid.alertGroups.length > this.groupsToRender.value && (
              <div className="d-flex flex-row justify-content-between">
                <span className="flex-shrink-1 flex-grow-1 text-center">
                  <button
                    type="button"
                    className="btn btn-secondary mb-3"
                    onClick={this.loadMore}
                  >
                    <FontAwesomeIcon
                      className="mr-2"
                      icon={faAngleDoubleDown}
                    />
                    Load more
                  </button>
                </span>
              </div>
            )}
        </React.Fragment>
      );
    }
  }
);
Grid.contextType = ThemeContext;

export { Grid };

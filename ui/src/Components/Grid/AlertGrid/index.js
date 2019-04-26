import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, computed } from "mobx";
import { observer } from "mobx-react";

import FontFaceObserver from "fontfaceobserver";

import moment from "moment";

import { debounce } from "lodash";

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
          width: document.body.clientWidth,
          update() {
            this.width = document.body.clientWidth;
          },
          get gridSizesConfig() {
            return GridSizesConfig(
              this.width,
              props.settingsStore.gridConfig.config.groupWidth
            );
          },
          get groupWidth() {
            return GetGridElementWidth(
              this.width,
              props.settingsStore.gridConfig.config.groupWidth
            );
          }
        },
        {
          update: action.bound,
          gridSizesConfig: computed,
          groupWidth: computed
        }
      );
    }

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

    // how many alert groups to render
    // FIXME reset on filter change
    initial = 50;
    groupsToRender = observable(
      {
        value: this.initial
      },
      {},
      { name: "Groups to render" }
    );
    // how many groups add to render count when user scrolls to the bottom
    loadMoreStep = 30;
    //
    loadMore = action(() => {
      const { alertStore } = this.props;

      this.groupsToRender.value = Math.min(
        this.groupsToRender.value + this.loadMoreStep,
        Object.keys(alertStore.data.groups).length
      );
    });

    compare = (a, b) => {
      const { alertStore, settingsStore } = this.props;

      const useDefaults =
        settingsStore.gridConfig.config.sortOrder ===
        settingsStore.gridConfig.options.default.value;

      const sortOrder = useDefaults
        ? alertStore.settings.values.sorting.grid.order
        : settingsStore.gridConfig.config.sortOrder;

      // don't sort if sorting is disabled
      if (sortOrder === settingsStore.gridConfig.options.disabled.value)
        return 0;

      const sortReverse =
        useDefaults || settingsStore.gridConfig.config.reverseSort === undefined
          ? alertStore.settings.values.sorting.grid.reverse
          : settingsStore.gridConfig.config.reverseSort;

      const sortLabel =
        useDefaults || settingsStore.gridConfig.config.sortLabel === undefined
          ? alertStore.settings.values.sorting.grid.label
          : settingsStore.gridConfig.config.sortLabel;

      const getLabelValue = g => {
        // if timestamp sort is enabled use latest alert for sorting
        if (sortOrder === settingsStore.gridConfig.options.startsAt.value) {
          return moment.max(g.alerts.map(a => moment(a.startsAt)));
        }

        const labelValue =
          g.labels[sortLabel] ||
          g.shared.labels[sortLabel] ||
          g.alerts[0].labels[sortLabel];
        let mappedValue;

        // check if we have a mapping for label value
        if (
          labelValue !== undefined &&
          alertStore.settings.values.sorting.valueMapping[sortLabel] !==
            undefined
        ) {
          mappedValue =
            alertStore.settings.values.sorting.valueMapping[sortLabel][
              labelValue
            ];
        }

        // if we have a mapped value then return it, if not return original value
        return mappedValue !== undefined ? mappedValue : labelValue;
      };

      const val = sortReverse ? -1 : 1;

      const av = getLabelValue(a);
      const bv = getLabelValue(b);

      if (av === undefined && av === undefined) {
        // if both alerts lack the label they are equal
        return 0;
      } else if (av === undefined || av > bv) {
        // if first one lacks it it's should be rendered after alerts with that label
        return val;
      } else if (bv === undefined || av < bv) {
        // if the first one has label but the second doesn't then the second should be rendered after the first
        return val * -1;
      } else {
        return 0;
      }
    };

    componentDidMount() {
      // We have font-display:swap set for font assets, this means that on initial
      // render a fallback font might be used and later swapped for the final one
      // (once the final font is loaded). This means that fallback font might
      // render to a different size and the swap can result in component resize.
      // For our grid this resize might leave gaps since everything uses fixed
      // position, so we use font observer and trigger repack when fonts are loaded

      const font400 = new FontFaceObserver("Lato", {
        weight: 400
      });
      // wait up to 30s, run no-op function on timeout
      font400.load(null, 30000).then(this.masonryRepack, () => {});

      const font700 = new FontFaceObserver("Lato", {
        weight: 700
      });
      font700.load(null, 30000).then(this.masonryRepack, () => {});
    }

    render() {
      const { alertStore, settingsStore, silenceFormStore } = this.props;

      return (
        <React.Fragment>
          <ReactResizeDetector
            handleWidth
            onResize={debounce(this.viewport.update, 100)}
          />
          <MasonryInfiniteScroller
            key={settingsStore.gridConfig.config.groupWidth}
            ref={this.storeMasonryRef}
            pack={true}
            sizes={this.viewport.gridSizesConfig}
            loadMore={this.loadMore}
            hasMore={
              this.groupsToRender.value <
              Object.keys(alertStore.data.groups).length
            }
            threshold={50}
            loader={
              <div key="loader" className="text-center text-muted py-3">
                <FontAwesomeIcon icon={faCircleNotch} size="lg" spin />
              </div>
            }
          >
            {Object.values(alertStore.data.groups)
              .sort(this.compare)
              .slice(0, this.groupsToRender.value)
              .map(group => (
                <AlertGroup
                  key={group.id}
                  group={group}
                  showAlertmanagers={
                    Object.keys(alertStore.data.upstreams.clusters).length > 1
                  }
                  afterUpdate={this.masonryRepack}
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

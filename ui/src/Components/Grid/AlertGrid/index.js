import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import moment from "moment";

import MasonryInfiniteScroller from "react-masonry-infinite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { AlertGroup } from "./AlertGroup";
import { GridSizesConfig } from "./Constants";

import "./index.css";

const AlertGrid = observer(
  class AlertGrid extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
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
    storeMasonryRef = action(ref => {
      this.masonryComponentReference.ref = ref;
    });
    // used to call forcePack() which will repack all grid elements
    // (alert groups), this needs to be called if any group size changes
    masonryRepack = action(() => {
      if (this.masonryComponentReference.ref !== false) {
        this.masonryComponentReference.ref.forcePack();
      }
    });

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
      // Hackish workaround for font loading
      // We have font-display:swap set for font assets, this means that on initial
      // render a fallback font might be used and later swapped for the final one
      // (once the final font is loaded). This means that fallback font might
      // render to a different size and the swap can result in component resize.
      // For our grid this resize might leave gaps since everything uses fixed
      // position, so we inject extra repack after 1s which should be enough
      // time for all assets to load.
      setTimeout(this.masonryRepack, 1000);
    }

    componentDidUpdate() {
      // whenever grid component re-renders we need to ensure that grid elements
      // are packed correctly
      this.masonryRepack();
    }

    render() {
      const { alertStore, settingsStore, silenceFormStore } = this.props;

      return (
        <React.Fragment>
          <MasonryInfiniteScroller
            ref={this.storeMasonryRef}
            pack={true}
            sizes={GridSizesConfig}
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
                />
              ))}
          </MasonryInfiniteScroller>
        </React.Fragment>
      );
    }
  }
);

export { AlertGrid };

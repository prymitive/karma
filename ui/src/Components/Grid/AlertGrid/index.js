import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

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
            loadMore={() => {
              this.loadMore();
            }}
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
            {Object.keys(alertStore.data.groups)
              .slice(0, this.groupsToRender.value)
              .map(id => (
                <AlertGroup
                  key={id}
                  group={alertStore.data.groups[id]}
                  showAlertmanagers={
                    alertStore.data.upstreams.instances.length > 1
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

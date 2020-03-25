import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import moment from "moment";

import { AlertStore, AlertStoreStatuses } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

const Fetcher = observer(
  class Fetcher extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
    };

    getSortSettings = () => {
      const { settingsStore } = this.props;

      let sortSettings = {
        useDefaults: false,
        sortOrder: "",
        sortLabel: "",
        sortReverse: "",
      };

      sortSettings.useDefaults =
        settingsStore.gridConfig.config.sortOrder ===
        settingsStore.gridConfig.options.default.value;

      if (sortSettings.useDefaults === true) {
        return sortSettings;
      }

      sortSettings.sortOrder = settingsStore.gridConfig.config.sortOrder;

      // don't sort if sorting is disabled
      if (
        sortSettings.sortOrder ===
        settingsStore.gridConfig.options.disabled.value
      )
        return sortSettings;

      sortSettings.sortReverse =
        settingsStore.gridConfig.config.reverseSort !== null
          ? settingsStore.gridConfig.config.reverseSort === true
            ? "1"
            : "0"
          : "";

      if (settingsStore.gridConfig.config.sortLabel !== null) {
        sortSettings.sortLabel = settingsStore.gridConfig.config.sortLabel;
      }

      return sortSettings;
    };

    fetchIfIdle = () => {
      const { alertStore, settingsStore } = this.props;

      const nextTick = moment(alertStore.status.lastUpdateAt).add(
        settingsStore.fetchConfig.config.interval,
        "seconds"
      );

      const pastDeadline = moment().isSameOrAfter(nextTick);

      const status = alertStore.status.value.toString();
      const updateInProgress =
        status === AlertStoreStatuses.Fetching.toString() ||
        status === AlertStoreStatuses.Processing.toString();

      if (pastDeadline && !updateInProgress && !alertStore.status.paused) {
        this.callFetch();
      }
    };

    timerTick = () => {
      window.requestAnimationFrame(this.fetchIfIdle);
    };

    callFetch = () => {
      const { alertStore } = this.props;

      const sortSettings = this.getSortSettings();
      alertStore.fetchWithThrottle(
        sortSettings.sortOrder,
        sortSettings.sortLabel,
        sortSettings.sortReverse
      );
    };

    componentDidMount() {
      // start first fetch once the browser is done doing busy loading
      window.requestAnimationFrame(this.fetchIfIdle);
      this.timer = setInterval(this.timerTick, 1000);
    }

    componentDidUpdate() {
      const { alertStore } = this.props;

      if (!alertStore.status.paused) {
        this.callFetch();
      }
    }

    componentWillUnmount() {
      clearInterval(this.timer);
      this.timer = null;
    }

    render() {
      const { alertStore, settingsStore } = this.props;

      return (
        // data-filters is there to register filters for observation in mobx
        <span
          data-filters={alertStore.filters.values.map((f) => f.raw).join(" ")}
          data-interval={settingsStore.fetchConfig.config.interval}
          data-grid-sort-order={settingsStore.gridConfig.config.sortOrder}
          data-grid-sort-label={settingsStore.gridConfig.config.sortLabel}
          data-grid-sort-reverse={settingsStore.gridConfig.config.reverseSort}
        />
      );
    }
  }
);

export { Fetcher };

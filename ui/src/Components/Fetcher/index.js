import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import moment from "moment";

import { AlertStore, AlertStoreStatuses } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

const Fetcher = observer(
  class Fetcher extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    lastTick = observable(
      {
        time: moment(0),
        update() {
          this.time = moment();
        }
      },
      {
        update: action
      }
    );

    fetchIfIdle = () => {
      const { alertStore, settingsStore } = this.props;

      const nextTick = moment(this.lastTick.time).add(
        settingsStore.fetchConfig.config.interval,
        "seconds"
      );

      const pastDeadline = moment().isSameOrAfter(nextTick);

      const status = alertStore.status.value.toString();
      const updateInProgress =
        status === AlertStoreStatuses.Fetching.toString() ||
        status === AlertStoreStatuses.Processing.toString();

      if (pastDeadline && !updateInProgress && !alertStore.status.paused) {
        this.lastTick.update();
        alertStore.fetchWithThrottle();
      }
    };

    timerTick = () => {
      this.fetchIfIdle();
    };

    componentDidMount() {
      this.fetchIfIdle();
      this.timer = setInterval(this.timerTick, 1000);
    }

    componentDidUpdate() {
      const { alertStore } = this.props;

      if (!alertStore.status.paused) {
        this.lastTick.update();
        alertStore.fetchWithThrottle();
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
          data-filters={alertStore.filters.values.map(f => f.raw).join(" ")}
          data-interval={settingsStore.fetchConfig.config.interval}
        />
      );
    }
  }
);

export { Fetcher };

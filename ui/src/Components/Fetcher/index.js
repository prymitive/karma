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
        completedAt: moment(0),
        update() {
          this.time = moment();
        },
        markCompleted() {
          this.completedAt = moment();
        }
      },
      {
        update: action,
        markCompleted: action
      }
    );

    fetchIfIdle = () => {
      const { alertStore, settingsStore } = this.props;

      // add 5s minimum interval between fetches
      const idleAt = moment(this.lastTick.completedAt).add(5, "seconds");
      const isIdle = moment().isSameOrAfter(idleAt);

      const nextTick = moment(this.lastTick.time).add(
        settingsStore.fetchConfig.config.interval,
        "seconds"
      );

      const pastDeadline = moment().isSameOrAfter(nextTick);

      const status = alertStore.status.value.toString();
      const updateInProgress =
        status === AlertStoreStatuses.Fetching.toString() ||
        status === AlertStoreStatuses.Processing.toString();

      if (
        isIdle &&
        pastDeadline &&
        !updateInProgress &&
        !alertStore.status.paused
      ) {
        this.lastTick.update();
        alertStore.fetchWithThrottle();
        this.lastTick.markCompleted();
      }
    };

    timerTick = () => {
      window.requestAnimationFrame(this.fetchIfIdle);
    };

    componentDidMount() {
      // start first fetch once the browser is done doing busy loading
      window.requestAnimationFrame(this.fetchIfIdle);
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

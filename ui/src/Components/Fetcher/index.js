import React, { Component } from "react";
import PropTypes from "prop-types";

import { toJS } from "mobx";
import { observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

const Fetcher = observer(
  class Fetcher extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    timer = null;

    interval = null;

    setTimer() {
      const { alertStore, settingsStore } = this.props;

      const newInterval = toJS(settingsStore.fetchConfig.interval);

      if (this.interval !== newInterval) {
        if (this.timer !== null) clearInterval(this.timer);

        this.interval = newInterval;
        this.timer = setInterval(
          () => alertStore.fetch(),
          this.interval * 1000
        );
      }
    }

    componentDidUpdate() {
      const { alertStore } = this.props;

      alertStore.fetch();

      this.setTimer();
    }

    componentDidMount() {
      const { alertStore } = this.props;

      alertStore.fetch();

      this.setTimer();
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
          data-interval={settingsStore.fetchConfig.interval}
        />
      );
    }
  }
);

export { Fetcher };

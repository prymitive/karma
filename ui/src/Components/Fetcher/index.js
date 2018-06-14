import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";

const Fetcher = observer(
  class Fetcher extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired
    };

    timer = null;

    // FIXME store last update timestamp and timer should inspect it (fire it
    // every 1s) rather than forcing fetch each time

    componentDidUpdate() {
      const { alertStore } = this.props;

      alertStore.fetch();
    }

    componentDidMount() {
      const { alertStore } = this.props;

      alertStore.fetch();

      this.timer = setInterval(() => this.props.alertStore.fetch(), 15000);
    }

    componentWillUnmount() {
      clearInterval(this.timer);
      this.timer = null;
    }

    render() {
      const { alertStore } = this.props;

      return (
        // data-filters is there to register filters for observation in mobx
        <span
          data-filters={alertStore.filters.values.map(f => f.raw).join(" ")}
        />
      );
    }
  }
);

export { Fetcher };

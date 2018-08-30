import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import Favico from "favico.js";

const FaviconBadge = observer(
  class FaviconBadge extends Component {
    static propTypes = {
      alertStore: PropTypes.object.isRequired
    };

    constructor(props) {
      super(props);

      this.favicon = new Favico({
        animation: "none",
        position: "up",
        bgColor: "#000",
        textColor: "#fff",
        fontStyle: "lighter"
      });
    }

    updateBadge = () => {
      const { alertStore } = this.props;

      if (alertStore.status.error !== null) {
        this.favicon.badge("?");
      } else {
        this.favicon.badge(alertStore.info.totalAlerts);
      }
    };

    componentDidMount() {
      this.updateBadge();
    }

    componentDidUpdate() {
      this.updateBadge();
    }

    render() {
      const { alertStore } = this.props;

      return (
        <span
          data-total-alerts={alertStore.info.totalAlerts}
          data-status-error={alertStore.status.error}
        />
      );
    }
  }
);

export { FaviconBadge };

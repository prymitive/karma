import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { AlertStoreStatuses } from "Stores/AlertStore";

class FetchIndicator extends Component {
  static propTypes = {
    status: PropTypes.string.isRequired
  };

  render() {
    const { status } = this.props;
    const visible = status === AlertStoreStatuses.InProgress.toString();
    return (
      <FontAwesomeIcon
        style={{ opacity: visible ? 1 : 0 }}
        className="ml-1 text-muted"
        icon={faCircleNotch}
        size="lg"
        spin
      />
    );
  }
}

export { FetchIndicator };

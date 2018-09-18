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

    const visible =
      status === AlertStoreStatuses.Fetching.toString() ||
      status === AlertStoreStatuses.Processing.toString();
    const textClass =
      status === AlertStoreStatuses.Fetching.toString()
        ? "text-muted"
        : "text-success";

    return (
      <FontAwesomeIcon
        style={{ opacity: visible ? 1 : 0 }}
        className={`mx-1 ${textClass}`}
        icon={faCircleNotch}
        size="lg"
        spin
      />
    );
  }
}

export { FetchIndicator };

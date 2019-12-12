import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket } from "@fortawesome/free-solid-svg-icons/faRocket";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { CenteredMessage } from "Components/CenteredMessage";

import "csshake/scss/csshake-slow.scss";

class UpgradeNeeded extends Component {
  static propTypes = {
    newVersion: PropTypes.string.isRequired,
    reloadAfter: PropTypes.number.isRequired
  };

  reloadApp = () => {
    window.location.reload();
  };

  componentDidMount() {
    const { reloadAfter } = this.props;
    this.timer = setTimeout(this.reloadApp, reloadAfter);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  render() {
    const { newVersion } = this.props;
    return (
      <CenteredMessage>
        <div className="container-fluid text-center">
          <div className="shake-slow shake-constant mb-4">
            <FontAwesomeIcon
              icon={faRocket}
              className="screen-center-icon-big text-success"
            />
          </div>
          <p className="lead text-muted">
            <FontAwesomeIcon className="mr-1" icon={faSpinner} spin />
            Upgrading to a new version: {newVersion}
          </p>
        </div>
      </CenteredMessage>
    );
  }
}

export { UpgradeNeeded };

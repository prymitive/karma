import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket } from "@fortawesome/free-solid-svg-icons/faRocket";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

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
      <div className="jumbotron text-center bg-primary my-4">
        <div className="container-fluid">
          <h1 className="display-1 my-5 text-success shake-slow shake-constant">
            <FontAwesomeIcon icon={faRocket} />
          </h1>
          <p className="lead text-muted">
            <FontAwesomeIcon className="mr-1" icon={faSpinner} spin />
            Upgrading to a new version: {newVersion}
          </p>
        </div>
      </div>
    );
  }
}

export { UpgradeNeeded };

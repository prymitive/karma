import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen } from "@fortawesome/free-solid-svg-icons/faBoxOpen";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

class UpgradeNeeded extends Component {
  static propTypes = {
    newVersion: PropTypes.string.isRequired
  };

  reloadApp = () => {
    window.location.reload();
  };

  componentDidMount() {
    this.timer = setTimeout(this.reloadApp, 3000);
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
          <h1 className="display-1 my-5 text-success">
            <FontAwesomeIcon icon={faBoxOpen} />
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

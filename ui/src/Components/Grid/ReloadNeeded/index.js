import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { CenteredMessage } from "Components/CenteredMessage";

class ReloadNeeded extends Component {
  static propTypes = {
    reloadAfter: PropTypes.number.isRequired,
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
    return (
      <CenteredMessage>
        <div className="container-fluid text-center">
          <FontAwesomeIcon
            icon={faExclamationCircle}
            className="screen-center-icon-big text-danger mb-4"
          />
          <p className="lead text-white bg-secondary p-3 rounded text-wrap text-break">
            <FontAwesomeIcon className="mr-2" icon={faSpinner} spin />
            All API connection attempts failed. This migth be caused by
            authentication middleware, will try to reload.
          </p>
        </div>
      </CenteredMessage>
    );
  }
}

export { ReloadNeeded };

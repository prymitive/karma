import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { CenteredMessage } from "Components/CenteredMessage";

class FatalError extends Component {
  static propTypes = {
    message: PropTypes.string.isRequired
  };

  render() {
    const { message } = this.props;
    return (
      <CenteredMessage>
        <div className="container-fluid text-center">
          <FontAwesomeIcon
            icon={faExclamationCircle}
            className="screen-center-icon-big text-danger mb-4"
          />
          <p className="lead text-white bg-secondary p-3 rounded text-wrap text-break">
            {message}
          </p>
        </div>
      </CenteredMessage>
    );
  }
}

export { FatalError };

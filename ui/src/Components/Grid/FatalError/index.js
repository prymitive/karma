import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

class FatalError extends Component {
  static propTypes = {
    message: PropTypes.string.isRequired
  };

  render() {
    const { message } = this.props;
    return (
      <div className="jumbotron text-center bg-primary my-4">
        <div className="container-fluid">
          <h1 className="display-1 my-5 text-danger">
            <FontAwesomeIcon icon={faExclamationCircle} />
          </h1>
          <p className="lead text-white bg-secondary px-1 py-3 rounded text-wrap text-break">
            {message}
          </p>
        </div>
      </div>
    );
  }
}

export { FatalError };

import React, { Component } from "react";
import PropTypes from "prop-types";

class UpstreamError extends Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired
  };

  render() {
    const { name, message } = this.props;
    return (
      <div className="alert alert-danger text-center m-1" role="alert">
        <h4 className="alert-heading mb-0">
          Alertmanager <span className="font-weight-bold">{name}</span> raised
          an error: {message}
        </h4>
      </div>
    );
  }
}

export { UpstreamError };

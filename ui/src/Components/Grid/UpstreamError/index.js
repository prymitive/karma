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
      <div
        key={name}
        className="alert alert-danger text-center rounded-0"
        role="alert"
      >
        <span className="badge badge-warning mr-2">{name}</span>
        {message}
      </div>
    );
  }
}

export { UpstreamError };

import React, { Component } from "react";
import PropTypes from "prop-types";

import * as Sentry from "@sentry/browser";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

const InternalError = ({ message, secondsLeft }) => (
  <div className="jumbotron text-center bg-primary my-4">
    <div className="container-fluid">
      <h1 className="display-1 my-5">
        <FontAwesomeIcon
          className="text-danger mr-2"
          icon={faExclamationCircle}
        />
        <span className="text-muted">Internal error</span>
      </h1>
      <p className="lead text-muted">{message}</p>
      <p className="text-muted">
        This page will auto refresh in {secondsLeft}s
      </p>
    </div>
  </div>
);
InternalError.propTypes = {
  message: PropTypes.node.isRequired,
  secondsLeft: PropTypes.number.isRequired
};

class ErrorBoundary extends Component {
  static propTypes = {
    children: PropTypes.any
  };

  constructor(props) {
    super(props);
    this.state = { cachedError: null, reloadSeconds: 60 };
  }

  reloadApp = () => {
    if (this.state.reloadSeconds <= 1) {
      window.location.reload();
    } else {
      this.setState({ reloadSeconds: this.state.reloadSeconds - 1 });
    }
  };

  componentDidCatch(error, errorInfo) {
    this.setState({ cachedError: error });
    Sentry.configureScope(scope => {
      Object.keys(errorInfo).forEach(key => {
        scope.setExtra(key, errorInfo[key]);
      });
    });
    Sentry.captureException(error);
    // reload after 60s, this is to fix wall monitors automatically
    setInterval(this.reloadApp, 1000);
  }

  render() {
    if (this.state.cachedError !== null) {
      return (
        <InternalError
          message={this.state.cachedError.toString()}
          secondsLeft={this.state.reloadSeconds}
        />
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };

import React, { Component } from "react";
import PropTypes from "prop-types";

import * as Sentry from "@sentry/browser";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBomb } from "@fortawesome/free-solid-svg-icons/faBomb";

const InternalError = ({ message, secondsLeft, progressLeft }) => (
  <div className="jumbotron text-center bg-primary my-4">
    <div className="container-fluid">
      <h1 className="display-1 my-5">
        <FontAwesomeIcon className="text-danger mr-2" icon={faBomb} />
        <span className="text-muted">Internal error</span>
      </h1>
      <p className="lead text-white bg-secondary px-1 py-3 rounded">
        {message}
      </p>
      <p className="text-muted d-inline-block">
        This page will auto refresh in {secondsLeft}s
        <span
          className="progress bg-secondary mx-auto"
          style={{ height: "2px" }}
        >
          <span
            className="progress-bar bg-info"
            role="progressbar"
            style={{ width: `${progressLeft}%` }}
            aria-valuenow={progressLeft}
            aria-valuemin="0"
            aria-valuemax="100"
          ></span>
        </span>
      </p>
    </div>
  </div>
);
InternalError.propTypes = {
  message: PropTypes.node.isRequired,
  secondsLeft: PropTypes.number.isRequired,
  progressLeft: PropTypes.number.isRequired
};

class ErrorBoundary extends Component {
  static propTypes = {
    children: PropTypes.any
  };

  constructor(props) {
    super(props);
    this.timer = null;
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
    // but only if the timer isn't set yet
    if (this.timer === null) {
      this.timer = setInterval(this.reloadApp, 1000);
    }
  }

  render() {
    if (this.state.cachedError !== null) {
      return (
        <InternalError
          message={this.state.cachedError.toString()}
          secondsLeft={this.state.reloadSeconds}
          progressLeft={(this.state.reloadSeconds / 60.0) * 100.0}
        />
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };

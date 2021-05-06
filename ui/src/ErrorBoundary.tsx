import { Component, FC, ReactNode, ErrorInfo } from "react";

import { captureException } from "@sentry/browser";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBomb } from "@fortawesome/free-solid-svg-icons/faBomb";

interface InternalErrorProps {
  message: ReactNode;
  secondsLeft: number;
  progressLeft: number;
}

const InternalError: FC<InternalErrorProps> = (props) => (
  <div className="text-placeholder screen-center">
    <div className="container-fluid text-center">
      <h1 className="display-1">
        <FontAwesomeIcon className="text-danger me-4" icon={faBomb} />
        <span className="text-muted">Internal error</span>
      </h1>
      <p className="lead text-white bg-secondary p-3 rounded text-wrap text-break">
        {props.message}
      </p>
      <p className="text-muted d-inline-block">
        This page will auto refresh in {props.secondsLeft}s
        <span
          className="progress bg-secondary mx-auto"
          style={{ height: "2px" }}
        >
          <span
            className="progress-bar bg-info"
            role="progressbar"
            style={{ width: `${props.progressLeft}%` }}
            aria-valuenow={props.progressLeft}
            aria-valuemin={0}
            aria-valuemax={100}
          ></span>
        </span>
      </p>
    </div>
  </div>
);

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  cachedError: Error | null;
  reloadSeconds: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  timer: ReturnType<typeof setInterval> | null;
  state: Readonly<ErrorBoundaryState> = {
    cachedError: null,
    reloadSeconds: 60,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.timer = null;
  }

  reloadApp = (): void => {
    if (this.state.reloadSeconds <= 1) {
      window.location.reload();
    } else {
      this.setState({ reloadSeconds: this.state.reloadSeconds - 1 });
    }
  };

  componentDidCatch(error: Error, { componentStack }: ErrorInfo): void {
    if (this.state.cachedError === null) {
      this.setState({ cachedError: error });
      captureException(error, {
        contexts: { react: { componentStack } },
      });
    }
    // reload after 60s, this is to fix wall monitors automatically
    // but only if the timer isn't set yet
    if (this.timer === null) {
      this.timer = setInterval(this.reloadApp, 1000);
    }
  }

  render(): ReactNode {
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

export { ErrorBoundary, InternalError };

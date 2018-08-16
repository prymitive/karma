import React, { Component } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";

import { SilenceSubmitProgress } from "./SilenceSubmitProgress";

class SilenceSubmitController extends Component {
  static propTypes = {
    silenceFormStore: PropTypes.object.isRequired
  };

  render() {
    const { silenceFormStore } = this.props;

    return (
      <React.Fragment>
        <div>
          {silenceFormStore.data.alertmanagers.map(am => (
            <SilenceSubmitProgress
              key={am.label}
              name={am.label}
              uri={am.value}
              payload={silenceFormStore.data.toAlertmanagerPayload}
            />
          ))}
        </div>
        <div className="d-flex flex-row-reverse">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={silenceFormStore.data.resetProgress}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="pr-1" />
            Back
          </button>
        </div>
      </React.Fragment>
    );
  }
}

export { SilenceSubmitController };

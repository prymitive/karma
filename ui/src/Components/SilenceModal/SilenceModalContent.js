import React, { Component } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import { SilenceForm } from "./SilenceForm";
import { SilenceSubmitController } from "./SilenceSubmitController";

const SilenceModalContent = observer(
  class SilenceModalContent extends Component {
    static propTypes = {
      alertStore: PropTypes.object.isRequired,
      silenceFormStore: PropTypes.object.isRequired,
      settingsStore: PropTypes.object.isRequired,
      onHide: PropTypes.func.isRequired
    };

    componentDidMount() {
      disableBodyScroll(document.querySelector(".modal"));
    }

    componentWillUnmount() {
      enableBodyScroll(document.querySelector(".modal"));
    }

    render() {
      const {
        alertStore,
        silenceFormStore,
        settingsStore,
        onHide
      } = this.props;

      return ReactDOM.createPortal(
        <div className="modal d-block bg-primary-transparent-80" role="dialog">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add new silence</h5>
                <button type="button" className="close" onClick={onHide}>
                  <span className="align-middle">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {silenceFormStore.data.inProgress ? (
                  <SilenceSubmitController
                    alertStore={alertStore}
                    silenceFormStore={silenceFormStore}
                  />
                ) : (
                  <SilenceForm
                    alertStore={alertStore}
                    silenceFormStore={silenceFormStore}
                    settingsStore={settingsStore}
                  />
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      );
    }
  }
);

export { SilenceModalContent };

import React, { Component } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceFormStage } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { MountModalBackdrop } from "Components/Animations/MountModal";
import { SilenceForm } from "./SilenceForm";
import { SilencePreview } from "./SilencePreview";
import { SilenceSubmitController } from "./SilenceSubmit/SilenceSubmitController";

const SilenceModalContent = observer(
  class SilenceModalContent extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
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
        <React.Fragment>
          <div className="modal d-block" role="dialog">
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {silenceFormStore.data.silenceID === null
                      ? silenceFormStore.data.currentStage ===
                        SilenceFormStage.UserInput
                        ? "Add new silence"
                        : silenceFormStore.data.currentStage ===
                          SilenceFormStage.Preview
                          ? "Preview silenced alerts"
                          : "Silence submitted"
                      : `Editing silence ${silenceFormStore.data.silenceID}`}
                  </h5>
                  <button type="button" className="close" onClick={onHide}>
                    <span className="align-middle">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  {silenceFormStore.data.currentStage ===
                  SilenceFormStage.UserInput ? (
                    <SilenceForm
                      alertStore={alertStore}
                      silenceFormStore={silenceFormStore}
                      settingsStore={settingsStore}
                    />
                  ) : silenceFormStore.data.currentStage ===
                  SilenceFormStage.Preview ? (
                    <SilencePreview
                      alertStore={alertStore}
                      silenceFormStore={silenceFormStore}
                    />
                  ) : (
                    <SilenceSubmitController
                      alertStore={alertStore}
                      silenceFormStore={silenceFormStore}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          <MountModalBackdrop
            in={silenceFormStore.toggle.visible}
            unmountOnExit
          >
            <div className="modal-backdrop d-block" />
          </MountModalBackdrop>
        </React.Fragment>,
        document.body
      );
    }
  }
);

export { SilenceModalContent };

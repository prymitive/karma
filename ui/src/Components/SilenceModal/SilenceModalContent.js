import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceFormStage } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
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

    render() {
      const {
        alertStore,
        silenceFormStore,
        settingsStore,
        onHide
      } = this.props;

      return (
        <React.Fragment>
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
        </React.Fragment>
      );
    }
  }
);

export { SilenceModalContent };

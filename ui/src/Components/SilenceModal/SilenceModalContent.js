import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons/faLock";

import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  SilenceFormStage,
  SilenceTabNames,
} from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { Tab } from "Components/Modal/Tab";
import { SilenceForm } from "./SilenceForm";
import { SilencePreview } from "./SilencePreview";
import { SilenceSubmitController } from "./SilenceSubmit/SilenceSubmitController";
import { Browser } from "./Browser";

const ReadOnlyPlaceholder = () => (
  <div className="jumbotron bg-transparent">
    <h1 className="display-5 text-placeholder text-center">
      <FontAwesomeIcon icon={faLock} className="mr-3" />
      Read only mode
    </h1>
  </div>
);

const SilenceModalContent = observer(
  class SilenceModalContent extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      onHide: PropTypes.func.isRequired,
      previewOpen: PropTypes.bool,
      onDeleteModalClose: PropTypes.func.isRequired,
    };
    static defaultProps = {
      previewOpen: false,
    };

    render() {
      const {
        alertStore,
        silenceFormStore,
        settingsStore,
        onHide,
        previewOpen,
        onDeleteModalClose,
      } = this.props;

      return (
        <React.Fragment>
          <div className="modal-header py-2">
            <nav className="nav nav-pills nav-justified w-100">
              <Tab
                title={
                  silenceFormStore.data.currentStage ===
                  SilenceFormStage.UserInput
                    ? silenceFormStore.data.silenceID === null
                      ? "New silence"
                      : "Editing silence"
                    : silenceFormStore.data.currentStage ===
                      SilenceFormStage.Preview
                    ? "Preview silenced alerts"
                    : "Silence submitted"
                }
                active={silenceFormStore.tab.current === SilenceTabNames.Editor}
                onClick={() =>
                  silenceFormStore.tab.setTab(SilenceTabNames.Editor)
                }
              />
              <Tab
                title="Browse"
                active={
                  silenceFormStore.tab.current === SilenceTabNames.Browser
                }
                onClick={() =>
                  silenceFormStore.tab.setTab(SilenceTabNames.Browser)
                }
              />
              <button type="button" className="close" onClick={onHide}>
                <span>&times;</span>
              </button>
            </nav>
          </div>
          <div
            className={`modal-body ${
              silenceFormStore.toggle.blurred && "modal-content-blur"
            }`}
          >
            {silenceFormStore.tab.current === SilenceTabNames.Editor ? (
              silenceFormStore.data.currentStage ===
              SilenceFormStage.UserInput ? (
                Object.keys(alertStore.data.clustersWithoutReadOnly).length >
                0 ? (
                  <SilenceForm
                    alertStore={alertStore}
                    silenceFormStore={silenceFormStore}
                    settingsStore={settingsStore}
                    previewOpen={previewOpen}
                  />
                ) : (
                  <ReadOnlyPlaceholder />
                )
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
              )
            ) : null}
            {silenceFormStore.tab.current === SilenceTabNames.Browser ? (
              <Browser
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
                settingsStore={settingsStore}
                onDeleteModalClose={onDeleteModalClose}
              />
            ) : null}
          </div>
        </React.Fragment>
      );
    }
  }
);

export { SilenceModalContent };

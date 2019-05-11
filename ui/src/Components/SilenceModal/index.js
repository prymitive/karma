import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { Modal } from "Components/Modal";
import { TooltipWrapper } from "Components/TooltipWrapper";

import "./index.css";

// https://github.com/facebook/react/issues/14603
const SilenceModalContent = React.lazy(() =>
  import("./SilenceModalContent").then(module => ({
    default: module.SilenceModalContent
  }))
);

const SilenceModal = observer(
  class SilenceModal extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    render() {
      const { alertStore, silenceFormStore, settingsStore } = this.props;

      return (
        <React.Fragment>
          <li className="nav-item">
            <TooltipWrapper title="Add new silence">
              <span
                className="nav-link cursor-pointer"
                onClick={silenceFormStore.toggle.toggle}
              >
                <FontAwesomeIcon icon={faBellSlash} />
              </span>
            </TooltipWrapper>
          </li>
          <Modal
            isOpen={silenceFormStore.toggle.visible}
            onExited={silenceFormStore.data.resetProgress}
          >
            <React.Suspense
              fallback={
                <h1 className="display-1 text-secondary p-5 m-auto">
                  <FontAwesomeIcon icon={faSpinner} size="lg" spin />
                </h1>
              }
            >
              <SilenceModalContent
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
                settingsStore={settingsStore}
                onHide={silenceFormStore.toggle.hide}
              />
            </React.Suspense>
          </Modal>
        </React.Fragment>
      );
    }
  }
);

export { SilenceModal };

import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { Modal } from "Components/Modal";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { SilenceModalContent } from "./SilenceModalContent";

import "./index.css";

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
            <SilenceModalContent
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              settingsStore={settingsStore}
              onHide={silenceFormStore.toggle.hide}
            />
          </Modal>
        </React.Fragment>
      );
    }
  }
);

export { SilenceModal };

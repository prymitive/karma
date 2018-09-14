import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { SilenceModalContent } from "./SilenceModalContent";

import "./index.css";

const SilenceModal = observer(
  class SilenceModal extends Component {
    static propTypes = {
      alertStore: PropTypes.object.isRequired,
      silenceFormStore: PropTypes.object.isRequired,
      settingsStore: PropTypes.object.isRequired
    };

    toggleModal = () => {
      const { silenceFormStore } = this.props;

      silenceFormStore.toggle.toggle();
      if (silenceFormStore.toggle.visible === false) {
        // need to reset progress if we're hiding modal
        // SilenceSubmitProgress sends a fetch on mount which would result in
        // duplicate silences if we didn't reset state of the form on destroy
        silenceFormStore.data.resetProgress();
      }
    };

    componentDidUpdate() {
      const { silenceFormStore } = this.props;

      document.body.classList.toggle(
        "modal-open",
        silenceFormStore.toggle.visible
      );
    }

    componentWillUnmount() {
      document.body.classList.remove("modal-open");
    }

    render() {
      const { alertStore, silenceFormStore, settingsStore } = this.props;

      return (
        <React.Fragment>
          <li className="nav-item">
            <a
              className="nav-link cursor-pointer"
              onClick={this.toggleModal}
              data-tooltip="Add new silence"
            >
              <FontAwesomeIcon icon={faBellSlash} />
            </a>
          </li>
          {silenceFormStore.toggle.visible ? (
            <SilenceModalContent
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              settingsStore={settingsStore}
              onHide={this.toggleModal}
            />
          ) : null}
        </React.Fragment>
      );
    }
  }
);

export { SilenceModal };

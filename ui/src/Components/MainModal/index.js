import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { Modal } from "Components/Modal";

// https://github.com/facebook/react/issues/14603
const MainModalContent = React.lazy(() =>
  import("./MainModalContent").then(module => ({
    default: module.MainModalContent
  }))
);

const MainModal = observer(
  class MainModal extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    toggle = observable(
      {
        show: false,
        toggle() {
          this.show = !this.show;
        },
        hide() {
          this.show = false;
        }
      },
      { toggle: action.bound, hide: action.bound }
    );

    render() {
      const { alertStore, settingsStore } = this.props;

      return (
        <React.Fragment>
          <li className="nav-item">
            <TooltipWrapper title="Settings">
              <span
                className="nav-link cursor-pointer"
                onClick={this.toggle.toggle}
              >
                <FontAwesomeIcon icon={faCog} />
              </span>
            </TooltipWrapper>
          </li>
          <Modal isOpen={this.toggle.show}>
            <React.Suspense
              fallback={
                <h1 className="display-1 text-secondary p-5 m-auto">
                  <FontAwesomeIcon icon={faSpinner} size="lg" spin />
                </h1>
              }
            >
              <MainModalContent
                alertStore={alertStore}
                settingsStore={settingsStore}
                onHide={this.toggle.hide}
                isVisible={this.toggle.show}
              />
            </React.Suspense>
          </Modal>
        </React.Fragment>
      );
    }
  }
);

export { MainModal };

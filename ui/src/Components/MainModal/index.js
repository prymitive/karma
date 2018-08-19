import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { MainModalContent } from "./MainModalContent";

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

    componentDidUpdate() {
      document.body.classList.toggle("modal-open", this.toggle.show);
    }

    componentWillUnmount() {
      document.body.classList.remove("modal-open");
    }

    render() {
      const { alertStore, settingsStore } = this.props;

      return (
        <React.Fragment>
          <li className="nav-item">
            <a
              className="nav-link cursor-pointer"
              onClick={this.toggle.toggle}
              data-tooltip="Open settings"
            >
              <FontAwesomeIcon icon={faCog} />
            </a>
          </li>
          {this.toggle.show ? (
            <MainModalContent
              alertStore={alertStore}
              settingsStore={settingsStore}
              onHide={this.toggle.hide}
            />
          ) : null}
        </React.Fragment>
      );
    }
  }
);

export { MainModal };

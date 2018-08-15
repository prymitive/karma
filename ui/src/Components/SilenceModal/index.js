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
      silenceFormStore: PropTypes.object.isRequired
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
      const { alertStore, silenceFormStore } = this.props;

      return (
        <React.Fragment>
          <li className="nav-item">
            <a
              className="nav-link cursor-pointer"
              onClick={silenceFormStore.toggle.toggle}
            >
              <FontAwesomeIcon icon={faBellSlash} />
            </a>
          </li>
          {silenceFormStore.toggle.visible ? (
            <SilenceModalContent
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
            />
          ) : null}
        </React.Fragment>
      );
    }
  }
);

export { SilenceModal };

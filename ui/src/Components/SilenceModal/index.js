import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { SilenceForm } from "./SilenceForm";
import { SilenceSubmitController } from "./SilenceSubmitController";

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
            <div
              className="modal d-block bg-primary-transparent-80"
              role="dialog"
            >
              <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add new silence</h5>
                    <button
                      type="button"
                      className="close"
                      onClick={silenceFormStore.toggle.hide}
                    >
                      <span className="align-middle">&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    {silenceFormStore.data.inProgress ? (
                      <SilenceSubmitController
                        silenceFormStore={silenceFormStore}
                      />
                    ) : (
                      <SilenceForm
                        alertStore={alertStore}
                        silenceFormStore={silenceFormStore}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </React.Fragment>
      );
    }
  }
);

export { SilenceModal };

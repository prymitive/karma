import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

import { APISilence } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceTabNames } from "Stores/SilenceFormStore";
import { MountFade } from "Components/Animations/MountFade";
import { SilenceComment } from "./SilenceComment";
import { SilenceDetails } from "./SilenceDetails";

import "./index.scss";

const ManagedSilence = observer(
  class ManagedSilence extends Component {
    static propTypes = {
      cluster: PropTypes.string.isRequired,
      silence: APISilence.isRequired,
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      onDidUpdate: PropTypes.func,
      onDeleteModalClose: PropTypes.func
    };

    // store collapse state, by default only silence comment is visible
    // the rest of the silence is hidden until expanded by a click
    collapse = observable(
      {
        value: true,
        toggle() {
          this.value = !this.value;
        }
      },
      { toggle: action.bound }
    );

    getAlertmanager = () =>
      this.props.alertStore.data.upstreams.instances
        .filter(u => u.cluster === this.props.cluster)
        .slice(0, 1)[0];

    onEditSilence = () => {
      const { silenceFormStore, silence } = this.props;

      const alertmanager = this.getAlertmanager();

      silenceFormStore.data.fillFormFromSilence(alertmanager, silence);
      silenceFormStore.data.resetProgress();
      silenceFormStore.tab.setTab(SilenceTabNames.Editor);
      silenceFormStore.toggle.show();
    };

    componentDidUpdate() {
      const { onDidUpdate } = this.props;
      if (onDidUpdate) onDidUpdate();
    }

    render() {
      const {
        cluster,
        silence,
        alertStore,
        silenceFormStore,
        onDeleteModalClose
      } = this.props;

      return (
        <MountFade in={true}>
          <div className="card my-1 components-managed-silence">
            <div className="card-header border-bottom-0">
              <div className="d-flex flex-row justify-content-between mw-100">
                <div className="flex-grow-1 flex-shrink-1 mr-2">
                  <div className="my-1">
                    <SilenceComment
                      silence={silence}
                      collapsed={this.collapse.value}
                    />
                  </div>
                </div>
                <div className="flex-grow-0 flex-shrink-0 mt-auto mb-0">
                  <FontAwesomeIcon
                    icon={this.collapse.value ? faChevronUp : faChevronDown}
                    className="text-muted cursor-pointer"
                    onClick={this.collapse.toggle}
                  />
                </div>
              </div>
            </div>

            {this.collapse.value ? null : (
              <div className="card-body pt-0">
                <SilenceDetails
                  cluster={cluster}
                  silence={silence}
                  alertStore={alertStore}
                  silenceFormStore={silenceFormStore}
                  onEditSilence={this.onEditSilence}
                  onDeleteModalClose={onDeleteModalClose}
                />
              </div>
            )}
          </div>
        </MountFade>
      );
    }
  }
);

export { ManagedSilence };

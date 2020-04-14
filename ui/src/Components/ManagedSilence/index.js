import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { Fade } from "react-reveal";

import { APISilence } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceTabNames } from "Stores/SilenceFormStore";
import { SilenceComment } from "./SilenceComment";
import { SilenceDetails } from "./SilenceDetails";

const ManagedSilence = observer(
  class ManagedSilence extends Component {
    static propTypes = {
      cluster: PropTypes.string.isRequired,
      alertCount: PropTypes.number.isRequired,
      alertCountAlwaysVisible: PropTypes.bool.isRequired,
      silence: APISilence.isRequired,
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      onDidUpdate: PropTypes.func,
      onDeleteModalClose: PropTypes.func,
      isOpen: PropTypes.bool,
    };
    static defaultProps = {
      isOpen: false,
    };

    constructor(props) {
      super(props);

      // store collapse state, by default only silence comment is visible
      // the rest of the silence is hidden until expanded by a click
      this.collapse = observable(
        {
          value: !props.isOpen,
          toggle() {
            this.value = !this.value;
          },
        },
        { toggle: action.bound }
      );
    }

    getAlertmanager = () =>
      this.props.alertStore.data.readWriteAlertmanagers
        .filter((u) => u.cluster === this.props.cluster)
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
        alertCount,
        alertCountAlwaysVisible,
        silence,
        alertStore,
        silenceFormStore,
        onDeleteModalClose,
      } = this.props;

      return (
        <Fade in={true} duration={500}>
          <div className="card my-1 components-managed-silence">
            <div className="card-header rounded-0 border-bottom-0 px-3">
              <SilenceComment
                alertStore={alertStore}
                cluster={cluster}
                silence={silence}
                alertCount={alertCount}
                alertCountAlwaysVisible={alertCountAlwaysVisible}
                collapsed={this.collapse.value}
                collapseToggle={this.collapse.toggle}
              />
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
        </Fade>
      );
    }
  }
);

export { ManagedSilence };

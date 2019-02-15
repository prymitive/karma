import React from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import ReactSelect from "react-select";

import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  AlertmanagerClustersToOption
} from "Stores/SilenceFormStore";
import { MultiSelect, ReactSelectStyles } from "Components/MultiSelect";
import { ValidationError } from "Components/MultiSelect/ValidationError";

const AlertManagerInput = observer(
  class AlertManagerInput extends MultiSelect {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    constructor(props) {
      super(props);

      const { alertStore, silenceFormStore } = props;

      if (silenceFormStore.data.alertmanagers.length === 0) {
        silenceFormStore.data.alertmanagers = AlertmanagerClustersToOption(
          alertStore.data.upstreams.clusters
        );
      }
    }

    onChange = action((newValue, actionMeta) => {
      const { silenceFormStore } = this.props;

      silenceFormStore.data.alertmanagers = newValue;
    });

    componentDidUpdate() {
      const { alertStore, silenceFormStore } = this.props;

      // get the list of last known alertmanagers
      const currentAlertmanagers = AlertmanagerClustersToOption(
        alertStore.data.upstreams.clusters
      );

      // now iterate what's set as silence form values and reset it if any
      // mismatch is detected
      for (const silenceAM of silenceFormStore.data.alertmanagers) {
        if (
          !currentAlertmanagers.map(am => am.label).includes(silenceAM.label)
        ) {
          silenceFormStore.data.alertmanagers = currentAlertmanagers;
        }
      }
    }

    render() {
      const { alertStore, silenceFormStore } = this.props;

      const extraProps = {};
      if (silenceFormStore.data.silenceID !== null) {
        extraProps.isDisabled = true;
      }

      return (
        <ReactSelect
          styles={ReactSelectStyles}
          classNamePrefix="react-select"
          instanceId="silence-input-alertmanagers"
          defaultValue={silenceFormStore.data.alertmanagers}
          options={AlertmanagerClustersToOption(
            alertStore.data.upstreams.clusters
          )}
          getOptionValue={JSON.stringify}
          placeholder={
            silenceFormStore.data.wasValidated ? (
              <ValidationError />
            ) : (
              "Alertmanager"
            )
          }
          isMulti
          onChange={this.onChange}
          {...extraProps}
        />
      );
    }
  }
);

export { AlertManagerInput };

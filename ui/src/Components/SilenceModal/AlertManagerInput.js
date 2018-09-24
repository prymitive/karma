import React from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import ReactSelect from "react-select";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { MultiSelect, ReactSelectStyles } from "Components/MultiSelect";
import { ValidationError } from "Components/MultiSelect/ValidationError";

const AlertmanagerInstancesToOptions = instances =>
  instances.map(i => ({
    label: i.name,
    value: i.publicURI
  }));

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
        silenceFormStore.data.alertmanagers = AlertmanagerInstancesToOptions(
          alertStore.data.upstreams.instances
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
      const currentAlertmanagers = AlertmanagerInstancesToOptions(
        alertStore.data.upstreams.instances
      );

      // now iterate what's set as silence form values and reset it if any
      // mismatch is detected (uri changed for example)
      for (const silenceAM of silenceFormStore.data.alertmanagers) {
        for (const currentAM of currentAlertmanagers) {
          if (
            silenceAM.label === currentAM.label &&
            silenceAM.value !== currentAM.value
          ) {
            silenceFormStore.data.alertmanagers = AlertmanagerInstancesToOptions(
              alertStore.data.upstreams.instances
            );
            return;
          }
        }
      }
    }

    render() {
      const { alertStore, silenceFormStore } = this.props;

      return (
        <ReactSelect
          styles={ReactSelectStyles}
          instanceId="silence-input-alertmanagers"
          defaultValue={silenceFormStore.data.alertmanagers}
          options={AlertmanagerInstancesToOptions(
            alertStore.data.upstreams.instances
          )}
          placeholder={
            silenceFormStore.data.wasValidated ? (
              <ValidationError />
            ) : (
              "Alertmanager"
            )
          }
          isMulti
          onChange={this.onChange}
        />
      );
    }
  }
);

export { AlertManagerInput };

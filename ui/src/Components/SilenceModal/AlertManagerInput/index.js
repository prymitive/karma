import React, { useEffect } from "react";
import PropTypes from "prop-types";

import { autorun } from "mobx";
import { useObserver } from "mobx-react-lite";

import Select from "react-select";

import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  AlertmanagerClustersToOption,
} from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { ValidationError } from "Components/ValidationError";

const AlertManagerInput = ({ alertStore, silenceFormStore }) => {
  useEffect(() => {
    if (silenceFormStore.data.alertmanagers.length === 0) {
      silenceFormStore.data.setAlertmanagers(
        AlertmanagerClustersToOption(alertStore.data.clustersWithoutReadOnly)
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    // https://mobx-react.netlify.app/recipes-effects
    () =>
      autorun(() => {
        // get the list of last known alertmanagers
        const currentAlertmanagers = AlertmanagerClustersToOption(
          alertStore.data.clustersWithoutReadOnly
        );

        // now iterate what's set as silence form values and reset it if any
        // mismatch is detected
        for (const silenceAM of silenceFormStore.data.alertmanagers) {
          if (
            !currentAlertmanagers
              .map((am) => JSON.stringify(am))
              .includes(JSON.stringify(silenceAM))
          ) {
            silenceFormStore.data.alertmanagers = currentAlertmanagers;
          }
        }
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const context = React.useContext(ThemeContext);

  return useObserver(() => (
    <Select
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId="silence-input-alertmanagers"
      value={silenceFormStore.data.alertmanagers}
      options={AlertmanagerClustersToOption(
        alertStore.data.clustersWithoutReadOnly
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
      onChange={(newValue) => {
        silenceFormStore.data.setAlertmanagers(newValue || []);
      }}
      isDisabled={silenceFormStore.data.silenceID !== null}
    />
  ));
};
AlertManagerInput.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

export { AlertManagerInput };

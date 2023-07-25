import React, { FC, useEffect } from "react";

import { autorun } from "mobx";
import { observer } from "mobx-react-lite";

import Select, { OnChangeValue } from "react-select";

import type { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  AlertmanagerClustersToOption,
} from "Stores/SilenceFormStore";
import type { MultiValueOptionT } from "Common/Select";
import { ThemeContext } from "Components/Theme";
import { AnimatedMultiMenu } from "Components/Select";
import { ValidationError } from "Components/ValidationError";

const AlertManagerInput: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
}> = observer(({ alertStore, silenceFormStore }) => {
  useEffect(() => {
    if (silenceFormStore.data.alertmanagers.length === 0) {
      // get only the clusters that match the defaults, or all of them if there are no defaults
      silenceFormStore.data.setAlertmanagers(
        AlertmanagerClustersToOption(
          alertStore.data.clustersWithoutReadOnly,
        ).filter((am) => {
          return (
            alertStore.settings.values.silenceForm.defaultAlertmanagers.some(
              (amName) => am.value.includes(amName),
            ) ||
            alertStore.settings.values.silenceForm.defaultAlertmanagers
              .length === 0
          );
        }),
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    // https://mobx-react.netlify.app/recipes-effects
    () =>
      autorun(() => {
        // get the list of last known alertmanagers
        const currentAlertmanagers = AlertmanagerClustersToOption(
          alertStore.data.clustersWithoutReadOnly,
        );

        // now iterate what's set as silence form values and reset it if any
        // mismatch is detected
        for (const silenceAM of silenceFormStore.data.alertmanagers) {
          if (
            !currentAlertmanagers
              .map((am) => JSON.stringify(am))
              .includes(JSON.stringify(silenceAM))
          ) {
            silenceFormStore.data.setAlertmanagers(currentAlertmanagers);
          }
        }
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const context = React.useContext(ThemeContext);

  return (
    <Select
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      instanceId="silence-input-alertmanagers"
      value={silenceFormStore.data.alertmanagers}
      options={AlertmanagerClustersToOption(
        alertStore.data.clustersWithoutReadOnly,
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
      onChange={(newValue: OnChangeValue<MultiValueOptionT, true>) => {
        silenceFormStore.data.setAlertmanagers(newValue as MultiValueOptionT[]);
      }}
      isDisabled={silenceFormStore.data.silenceID !== null}
      components={{ Menu: AnimatedMultiMenu }}
    />
  );
});

export { AlertManagerInput };

import React from "react";
import PropTypes from "prop-types";

import { ManagedSilence } from "Components/ManagedSilence";
const FallbackSilenceDesciption = ({ silenceID }) => {
  return (
    <div className="m-1">
      <small className="text-muted">Silenced by {silenceID}</small>
    </div>
  );
};
FallbackSilenceDesciption.propTypes = {
  silenceID: PropTypes.string.isRequired,
};

const GetSilenceFromStore = (alertStore, cluster, silenceID) => {
  const amSilences = alertStore.data.silences[cluster];
  if (!amSilences) return null;

  // next check if alertmanager has our silence ID
  const silence = amSilences[silenceID];
  if (!silence) return null;

  return silence;
};

const RenderSilence = (
  alertStore,
  silenceFormStore,
  afterUpdate,
  cluster,
  silenceID
) => {
  const silence = GetSilenceFromStore(alertStore, cluster, silenceID);

  if (silence === null) {
    return (
      <FallbackSilenceDesciption
        key={silenceID}
        silenceID={silenceID}
      ></FallbackSilenceDesciption>
    );
  }

  return (
    <ManagedSilence
      key={silenceID}
      cluster={cluster}
      alertCount={0}
      alertCountAlwaysVisible={false}
      silence={silence}
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      onDidUpdate={afterUpdate}
    />
  );
};

export { RenderSilence };

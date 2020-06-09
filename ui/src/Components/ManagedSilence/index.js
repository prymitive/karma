import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { Fade } from "react-reveal";

import { APISilence } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceTabNames } from "Stores/SilenceFormStore";
import { ThemeContext } from "Components/Theme";
import { SilenceComment } from "./SilenceComment";
import { SilenceDetails } from "./SilenceDetails";

const GetAlertmanager = (alertStore, cluster) =>
  alertStore.data.readWriteAlertmanagers
    .filter((u) => u.cluster === cluster)
    .slice(0, 1)[0];

const ManagedSilence = ({
  cluster,
  alertCount,
  alertCountAlwaysVisible,
  silence,
  alertStore,
  silenceFormStore,
  isOpen,
  onDidUpdate,
  isNested,
}) => {
  useEffect(() => {
    if (onDidUpdate) onDidUpdate();
  });

  const [showDetails, setShowDetails] = useState(isOpen);

  const onEditSilence = () => {
    const alertmanager = GetAlertmanager(alertStore, cluster);

    silenceFormStore.data.fillFormFromSilence(alertmanager, silence);
    silenceFormStore.data.resetProgress();
    silenceFormStore.tab.setTab(SilenceTabNames.Editor);
    silenceFormStore.toggle.show();
  };

  const context = React.useContext(ThemeContext);

  return (
    <Fade in={context.animations.in} duration={context.animations.duration}>
      <div className="card my-1 components-managed-silence">
        <div className="card-header rounded-0 border-bottom-0 px-3">
          <SilenceComment
            alertStore={alertStore}
            cluster={cluster}
            silence={silence}
            alertCount={alertCount}
            alertCountAlwaysVisible={alertCountAlwaysVisible}
            collapsed={!showDetails}
            collapseToggle={() => setShowDetails(!showDetails)}
          />
        </div>

        {showDetails ? (
          <div className="card-body pt-0">
            <SilenceDetails
              cluster={cluster}
              silence={silence}
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              onEditSilence={onEditSilence}
              isUpper={isNested}
            />
          </div>
        ) : null}
      </div>
    </Fade>
  );
};
ManagedSilence.propTypes = {
  cluster: PropTypes.string.isRequired,
  alertCount: PropTypes.number.isRequired,
  alertCountAlwaysVisible: PropTypes.bool.isRequired,
  silence: APISilence.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  onDidUpdate: PropTypes.func,
  onDeleteModalClose: PropTypes.func,
  isOpen: PropTypes.bool,
  isNested: PropTypes.bool,
};
ManagedSilence.defaultProps = {
  isOpen: false,
  isNested: false,
};

export { ManagedSilence, GetAlertmanager };

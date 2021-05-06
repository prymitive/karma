import { FC } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import SingleClusterStatus from "./SingleClusterStatus";
import MultiClusterStatus from "./MultiClusterStatus";

const SilenceSubmitController: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
}> = ({ silenceFormStore, alertStore }) => {
  return (
    <>
      {Object.keys(silenceFormStore.data.requestsByCluster).length === 1 ? (
        <SingleClusterStatus
          silenceFormStore={silenceFormStore}
          alertStore={alertStore}
        />
      ) : (
        <MultiClusterStatus
          silenceFormStore={silenceFormStore}
          alertStore={alertStore}
        />
      )}
      <div className="d-flex flex-row-reverse">
        <button
          type="button"
          className="btn btn-primary"
          onClick={silenceFormStore.data.resetProgress}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="pe-1" />
          Back
        </button>
      </div>
    </>
  );
};

export default observer(SilenceSubmitController);

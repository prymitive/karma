import { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { PaginatedAlertList } from "Components/PaginatedAlertList";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const SilencePreview: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
}> = ({ alertStore, silenceFormStore }) => {
  const filters = [
    ...silenceFormStore.data.matchers.map((m) => MatcherToFilter(m)),
    AlertManagersToFilter(silenceFormStore.data.alertmanagers),
  ];

  return (
    <>
      <div className="mb-3">
        <PaginatedAlertList
          alertStore={alertStore}
          filters={filters}
          title="Affected alerts"
        />
      </div>
      <div className="d-flex flex-row-reverse">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => silenceFormStore.data.setStage("submit")}
        >
          <FontAwesomeIcon icon={faCheckCircle} className="pe-1" />
          Submit
        </button>
        <button
          type="button"
          className="btn btn-danger me-2"
          onClick={silenceFormStore.data.resetProgress}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="pe-1" />
          Back
        </button>
      </div>
    </>
  );
};

export { SilencePreview };

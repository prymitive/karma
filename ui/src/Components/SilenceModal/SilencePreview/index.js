import React from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { PaginatedAlertList } from "Components/PaginatedAlertList";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const SilencePreview = ({ alertStore, silenceFormStore }) => {
  const filters = [
    ...silenceFormStore.data.matchers.map((m) => MatcherToFilter(m)),
    AlertManagersToFilter(silenceFormStore.data.alertmanagers),
  ];

  return (
    <React.Fragment>
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
          onClick={silenceFormStore.data.setStageSubmit}
        >
          <FontAwesomeIcon icon={faCheckCircle} className="pr-1" />
          Submit
        </button>
        <button
          type="button"
          className="btn btn-danger mr-2"
          onClick={silenceFormStore.data.resetProgress}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="pr-1" />
          Back
        </button>
      </div>
    </React.Fragment>
  );
};
SilencePreview.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

export { SilencePreview };

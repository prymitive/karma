import React from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore, FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import {
  LabelSetList,
  GroupListToUniqueLabelsList,
} from "Components/LabelSetList";
import { useFetchGet } from "Hooks/useFetchGet";
import { MatcherToFilter, AlertManagersToFilter } from "../Matchers";

const FetchError = ({ message }) => (
  <div className="text-center">
    <h2 className="display-2 text-danger">
      <FontAwesomeIcon icon={faExclamationCircle} />
    </h2>
    <p className="lead text-muted">{message}</p>
  </div>
);
FetchError.propTypes = {
  message: PropTypes.node.isRequired,
};

const Placeholder = () => (
  <div className="jumbotron bg-transparent">
    <h1 className="display-5 text-placeholder text-center">
      <FontAwesomeIcon icon={faSpinner} size="lg" spin />
    </h1>
  </div>
);

const SilencePreview = ({ alertStore, silenceFormStore }) => {
  const filters = [
    ...silenceFormStore.data.matchers.map((m) => MatcherToFilter(m)),
    AlertManagersToFilter(silenceFormStore.data.alertmanagers),
  ];

  const { response, error, isLoading } = useFetchGet(
    FormatBackendURI("alerts.json?") + FormatAlertsQ(filters)
  );

  return (
    <React.Fragment>
      <div className="mb-3">
        {isLoading ? (
          <Placeholder />
        ) : error ? (
          <FetchError message={error} />
        ) : (
          <LabelSetList
            alertStore={alertStore}
            labelsList={GroupListToUniqueLabelsList(
              response.grids.length ? response.grids[0].alertGroups : []
            )}
          />
        )}
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

import React, { FC, ReactNode } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { AlertStore, FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import {
  LabelSetList,
  GroupListToUniqueLabelsList,
} from "Components/LabelSetList";
import { useFetchGet } from "Hooks/useFetchGet";

const FetchError: FC<{ message: ReactNode }> = ({ message }) => (
  <div className="text-center">
    <h2 className="display-2 text-danger">
      <FontAwesomeIcon icon={faExclamationCircle} />
    </h2>
    <p className="lead text-muted">{message}</p>
  </div>
);

const Placeholder = () => (
  <div className="jumbotron bg-transparent">
    <h1 className="display-5 text-placeholder text-center">
      <FontAwesomeIcon icon={faSpinner} size="lg" spin />
    </h1>
  </div>
);

const PaginatedAlertList: FC<{
  alertStore: AlertStore;
  filters: string[];
  title: string;
}> = ({ alertStore, filters, title }) => {
  const { response, error, isLoading } = useFetchGet(
    FormatBackendURI("alerts.json?") + FormatAlertsQ(filters)
  );

  return isLoading ? (
    <Placeholder />
  ) : error ? (
    <FetchError message={error} />
  ) : (
    <LabelSetList
      alertStore={alertStore}
      labelsList={GroupListToUniqueLabelsList(
        response.grids.length ? response.grids[0].alertGroups : []
      )}
      title={title}
    />
  );
};

export { PaginatedAlertList };

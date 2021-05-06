import { FC, ReactNode } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { APIAlertsResponseT } from "Models/APITypes";
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
  <div className="px-2 py-5 bg-transparent">
    <h1 className="display-5 text-placeholder text-center">
      <FontAwesomeIcon icon={faSpinner} size="lg" spin />
    </h1>
  </div>
);

const PaginatedAlertList: FC<{
  alertStore: AlertStore;
  filters: string[];
  title?: string;
}> = ({ alertStore, filters, title }) => {
  const { response, error, isLoading } = useFetchGet<APIAlertsResponseT>(
    FormatBackendURI("alerts.json?") + FormatAlertsQ(filters)
  );

  return error ? (
    <FetchError message={error} />
  ) : isLoading || response === null ? (
    <Placeholder />
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

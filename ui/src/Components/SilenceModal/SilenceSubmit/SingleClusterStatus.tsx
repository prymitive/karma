import { FC } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceSubmitProgress } from "./SilenceSubmitProgress";

const SingleClusterStatus: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
}> = ({ silenceFormStore, alertStore }) => {
  const clusterRequest = Object.values(
    silenceFormStore.data.requestsByCluster
  )[0];

  return (
    <div className="text-center">
      <div className="display-1 mb-3">
        {clusterRequest.isDone ? (
          clusterRequest.error ? (
            <FontAwesomeIcon
              icon={faExclamationCircle}
              className="text-danger"
            />
          ) : (
            <FontAwesomeIcon icon={faCheckCircle} className="text-success" />
          )
        ) : (
          <SilenceSubmitProgress
            key={clusterRequest.cluster}
            cluster={clusterRequest.cluster}
            members={clusterRequest.members}
            payload={silenceFormStore.data.toAlertmanagerPayload}
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
          />
        )}
      </div>
      <div className="badge bg-primary">{clusterRequest.cluster}</div>
      {clusterRequest.isDone ? (
        <p
          className={`mt-2 rounded text-center ${
            clusterRequest.isDone && clusterRequest.error ? "bg-light" : ""
          }`}
        >
          {clusterRequest.error ? (
            clusterRequest.error
          ) : (
            <a
              href={clusterRequest.silenceLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {clusterRequest.silenceID}
            </a>
          )}
        </p>
      ) : null}
    </div>
  );
};

export default observer(SingleClusterStatus);

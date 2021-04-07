import { FC } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceSubmitProgress } from "./SilenceSubmitProgress";

const MultiClusterStatus: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
}> = ({ silenceFormStore, alertStore }) => {
  return (
    <div className="table-responsive">
      <table className="table table-borderless">
        <tbody>
          {Object.values(silenceFormStore.data.requestsByCluster).map(
            (clusterRequest) => (
              <tr key={clusterRequest.cluster}>
                <td className="align-middle" style={{ width: "1%" }}>
                  {clusterRequest.isDone ? (
                    clusterRequest.error ? (
                      <FontAwesomeIcon
                        icon={faExclamationCircle}
                        className="text-danger"
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-success"
                      />
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
                </td>
                <td className="align-middle">{clusterRequest.cluster}</td>
                <td>
                  <div
                    className={`rounded text-center ${
                      clusterRequest.isDone && clusterRequest.error
                        ? "bg-light"
                        : ""
                    }`}
                  >
                    {clusterRequest.isDone ? (
                      clusterRequest.error ? (
                        clusterRequest.error
                      ) : (
                        <a
                          href={clusterRequest.silenceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {clusterRequest.silenceID}
                        </a>
                      )
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default observer(MultiClusterStatus);

import { FC, useEffect, useState, ReactNode } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faRedo } from "@fortawesome/free-solid-svg-icons/faRedo";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import { useFetchDelete } from "Hooks/useFetchDelete";
import { Modal } from "Components/Modal";
import { PaginatedAlertList } from "Components/PaginatedAlertList";

const ProgressMessage: FC = () => (
  <div className="text-center">
    <FontAwesomeIcon
      icon={faCircleNotch}
      className="text-muted display-1 mb-3"
      spin
    />
  </div>
);

const ErrorMessage: FC<{
  message: ReactNode;
}> = ({ message }) => (
  <div className="text-center">
    <FontAwesomeIcon
      icon={faExclamationCircle}
      className="text-danger display-1 mb-3"
    />
    <p>{message}</p>
  </div>
);

const SuccessMessage: FC = () => (
  <div className="text-center">
    <FontAwesomeIcon
      icon={faCheckCircle}
      className="text-success display-1 mb-3"
    />
    <p>
      Silence deleted, it might take a few minutes for affected alerts to change
      state
    </p>
  </div>
);

const DeleteResult: FC<{
  alertStore: AlertStore;
  cluster: string;
  silence: APISilenceT;
}> = ({ alertStore, cluster, silence }) => {
  const [currentTime, setCurrentTime] = useState<number>(
    Math.floor(Date.now())
  );

  const am = alertStore.data.readWriteAlertmanagers
    .filter((u) => u.cluster === cluster)
    .slice(0, 1)[0];

  const [deleteFetchOptions] = useState<RequestInit>({
    headers: am.headers,
    credentials: am.corsCredentials,
  });

  const { error, isDeleting } = useFetchDelete(
    `${am.uri}/api/v2/silence/${silence.id}`,
    deleteFetchOptions,
    [currentTime]
  );

  return (
    <>
      {isDeleting ? (
        <ProgressMessage />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <SuccessMessage />
      )}
      {error || isDeleting ? (
        <div className="d-flex flex-row-reverse">
          <button
            type="button"
            className="btn btn-danger me-2"
            onClick={() => setCurrentTime(Math.floor(Date.now()))}
            disabled={isDeleting}
          >
            <FontAwesomeIcon
              icon={isDeleting ? faCheckCircle : faRedo}
              className="me-1"
            />
            {isDeleting ? "Confirm" : "Retry"}
          </button>
        </div>
      ) : null}
    </>
  );
};

const DeleteSilenceModalContent: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  cluster: string;
  silence: APISilenceT;
  onHide: () => void;
}> = ({ alertStore, silenceFormStore, cluster, silence, onHide }) => {
  const [confirm, setConfirm] = useState<boolean>(false);

  useEffect(() => {
    silenceFormStore.toggle.setBlur(true);
    return () => silenceFormStore.toggle.setBlur(false);
  }, [silenceFormStore.toggle]);

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">Delete silence</h5>
        <button type="button" className="btn-close" onClick={onHide}></button>
      </div>
      <div className="modal-body">
        {confirm ? (
          <DeleteResult
            alertStore={alertStore}
            cluster={cluster}
            silence={silence}
          />
        ) : (
          <>
            <PaginatedAlertList
              alertStore={alertStore}
              filters={[
                FormatQuery(
                  StaticLabels.SilenceID,
                  QueryOperators.Equal,
                  silence.id
                ),
              ]}
              title="Affected alerts"
            />
            <div className="d-flex flex-row-reverse">
              <button
                type="button"
                className="btn btn-danger me-2"
                onClick={() => setConfirm(true)}
                disabled={confirm}
              >
                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const DeleteSilence: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  cluster: string;
  silence: APISilenceT;
  isUpper?: boolean;
}> = ({ alertStore, silenceFormStore, cluster, silence, isUpper = false }) => {
  const [visible, setVisible] = useState<boolean>(false);

  const members =
    alertStore.data.getClusterAlertmanagersWithoutReadOnly(cluster);

  return (
    <>
      <button
        className="btn btn-danger btn-sm"
        disabled={members.length === 0}
        onClick={() => {
          members.length > 0 && setVisible(true);
        }}
      >
        <FontAwesomeIcon
          className="me-1 d-none d-sm-inline-block"
          icon={faTrash}
        />
        Delete
      </button>
      <Modal
        isOpen={visible}
        isUpper={isUpper}
        toggleOpen={() => setVisible(false)}
      >
        <DeleteSilenceModalContent
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          cluster={cluster}
          silence={silence}
          onHide={() => setVisible(false)}
        />
      </Modal>
    </>
  );
};

export { DeleteSilence, DeleteSilenceModalContent, DeleteResult };

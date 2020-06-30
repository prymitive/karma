import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { APISilence } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import { useFetchDelete } from "Hooks/useFetchDelete";
import { Modal } from "Components/Modal";
import { PaginatedAlertList } from "Components/PaginatedAlertList";

const ProgressMessage = () => (
  <div className="text-center">
    <FontAwesomeIcon
      icon={faCircleNotch}
      className="text-muted display-1 mb-3"
      spin
    />
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="text-center">
    <FontAwesomeIcon
      icon={faExclamationCircle}
      className="text-danger display-1 mb-3"
    />
    <p>{message}</p>
  </div>
);
ErrorMessage.propTypes = {
  message: PropTypes.node.isRequired,
};

const SuccessMessage = () => (
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

const DeleteResult = ({ alertStore, cluster, silence }) => {
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now()));

  const am = alertStore.data.readWriteAlertmanagers
    .filter((u) => u.cluster === cluster)
    .slice(0, 1)[0];

  const [deleteFetchOptions] = useState({
    headers: am.headers,
    credentials: am.corsCredentials,
  });

  const {
    error,
    isDeleting,
  } = useFetchDelete(
    `${am.uri}/api/v2/silence/${silence.id}`,
    deleteFetchOptions,
    [currentTime]
  );

  return (
    <React.Fragment>
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
            className="btn btn-danger mr-2"
            onClick={() => setCurrentTime(Math.floor(Date.now()))}
            disabled={isDeleting}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
            {isDeleting ? "Confirm" : "Retry"}
          </button>
        </div>
      ) : null}
    </React.Fragment>
  );
};
DeleteResult.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  cluster: PropTypes.string.isRequired,
  silence: APISilence.isRequired,
};

const DeleteSilenceModalContent = ({
  alertStore,
  silenceFormStore,
  cluster,
  silence,
  onHide,
}) => {
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    silenceFormStore.toggle.setBlur(true);
    return () => silenceFormStore.toggle.setBlur(false);
  }, [silenceFormStore.toggle]);

  return (
    <React.Fragment>
      <div className="modal-header">
        <h5 className="modal-title">Delete silence</h5>
        <button type="button" className="close" onClick={onHide}>
          <span>&times;</span>
        </button>
      </div>
      <div className="modal-body">
        {confirm ? (
          <DeleteResult
            alertStore={alertStore}
            cluster={cluster}
            silence={silence}
          />
        ) : (
          <React.Fragment>
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
                className="btn btn-danger mr-2"
                onClick={setConfirm}
                disabled={confirm}
              >
                <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                Confirm
              </button>
            </div>
          </React.Fragment>
        )}
      </div>
    </React.Fragment>
  );
};
DeleteSilenceModalContent.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  cluster: PropTypes.string.isRequired,
  silence: APISilence.isRequired,
  onHide: PropTypes.func,
};

const DeleteSilence = ({
  alertStore,
  silenceFormStore,
  cluster,
  silence,
  isUpper,
}) => {
  const [visible, setVisible] = useState(false);

  const members = alertStore.data.getClusterAlertmanagersWithoutReadOnly(
    cluster
  );

  return (
    <React.Fragment>
      <button
        className="btn btn-danger btn-sm"
        disabled={members.length === 0}
        onClick={() => {
          members.length > 0 && setVisible(true);
        }}
      >
        <FontAwesomeIcon
          className="mr-1 d-none d-sm-inline-block"
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
    </React.Fragment>
  );
};
DeleteSilence.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  cluster: PropTypes.string.isRequired,
  silence: APISilence.isRequired,
  isUpper: PropTypes.bool,
};
DeleteSilence.defaultProps = {
  isUpper: false,
};

export { DeleteSilence, DeleteSilenceModalContent, DeleteResult };

import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer, useObserver, useLocalStore } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { APISilence } from "Models/API";
import { AlertStore, FormatBackendURI, FormatAlertsQ } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import { FetchGet, FetchDelete } from "Common/Fetch";
import { Modal } from "Components/Modal";
import {
  LabelSetList,
  GroupListToUniqueLabelsList,
} from "Components/LabelSetList";

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

const DeleteSilenceModalContent = observer(
  class DeleteSilenceModalContent extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      cluster: PropTypes.string.isRequired,
      silence: APISilence.isRequired,
      onHide: PropTypes.func,
    };

    previewState = observable(
      {
        fetch: null,
        error: null,
        alertLabels: [],
        setError(err) {
          this.error = err;
        },
        groupsToUniqueLabels(groups) {
          this.alertLabels = GroupListToUniqueLabelsList(groups);
        },
      },
      {
        setError: action.bound,
        groupsToUniqueLabels: action.bound,
      }
    );

    deleteState = observable(
      {
        fetch: null,
        done: false,
        error: null,
        setDone() {
          this.done = true;
        },
        setError(err) {
          this.error = err;
        },
        reset() {
          this.done = false;
          this.error = null;
        },
      },
      {
        setDone: action.bound,
        setError: action.bound,
        reset: action.bound,
      }
    );

    getAlertmanager = () =>
      this.props.alertStore.data.readWriteAlertmanagers
        .filter((u) => u.cluster === this.props.cluster)
        .slice(0, 1)[0];

    onFetchPreview = () => {
      const { silence } = this.props;

      const alertsURI =
        FormatBackendURI("alerts.json?") +
        FormatAlertsQ([
          FormatQuery(StaticLabels.SilenceID, QueryOperators.Equal, silence.id),
        ]);

      this.previewState.fetch = FetchGet(alertsURI, {})
        .then((result) => result.json())
        .then((result) => {
          this.previewState.groupsToUniqueLabels(
            result.grids.length ? result.grids[0].alertGroups : []
          );
          this.previewState.setError(null);
        })
        .catch((err) => {
          console.trace(err);
          return this.previewState.setError(
            `Request fetching affected alerts failed with: ${err.message}`
          );
        });
    };

    onDelete = () => {
      const { silence } = this.props;

      // if it's already deleted then do nothing
      if (this.deleteState.done && this.deleteState.error === null) return;

      // reset state so we get a spinner
      this.deleteState.reset();

      const alertmanager = this.getAlertmanager();

      this.deleteState.fetch = FetchDelete(
        `${alertmanager.uri}/api/v2/silence/${silence.id}`,
        {
          headers: alertmanager.headers,
          credentials: alertmanager.corsCredentials,
        }
      )
        .then((result) => {
          if (result.ok) {
            this.deleteState.setError(null);
            this.deleteState.setDone();
          } else {
            result.text().then(this.deleteState.setError);
            this.deleteState.setDone();
          }
        })
        .catch((err) => {
          console.trace(err);
          this.deleteState.setDone();
          return this.deleteState.setError(
            `Delete request failed with: ${err.message}`
          );
        });
    };

    componentDidMount() {
      const { silenceFormStore } = this.props;
      silenceFormStore.toggle.setBlur(true);
      this.onFetchPreview();
    }

    componentWillUnmount() {
      const { silenceFormStore } = this.props;
      silenceFormStore.toggle.setBlur(false);
    }

    render() {
      const { alertStore, onHide } = this.props;

      const isDone = this.deleteState.done && this.deleteState.error === null;

      return (
        <React.Fragment>
          <div className="modal-header">
            <h5 className="modal-title">Delete silence</h5>
            <button type="button" className="close" onClick={onHide}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {this.deleteState.done ? (
              this.deleteState.error !== null ? (
                <ErrorMessage message={this.deleteState.error} />
              ) : (
                <SuccessMessage />
              )
            ) : this.deleteState.fetch !== null ? (
              <ProgressMessage />
            ) : this.previewState.error === null ? (
              <LabelSetList
                alertStore={alertStore}
                labelsList={this.previewState.alertLabels}
              />
            ) : (
              <ErrorMessage message={this.previewState.error} />
            )}
            {isDone ? null : (
              <div className="d-flex flex-row-reverse">
                <button
                  type="button"
                  className="btn btn-danger mr-2"
                  onClick={this.onDelete}
                  disabled={
                    this.deleteState.fetch !== null &&
                    this.deleteState.done === false
                  }
                >
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                  {this.deleteState.fetch !== null &&
                  this.deleteState.error !== null
                    ? "Retry"
                    : "Confirm"}
                </button>
              </div>
            )}
          </div>
        </React.Fragment>
      );
    }
  }
);

const DeleteSilence = ({
  alertStore,
  silenceFormStore,
  cluster,
  silence,
  onModalExit,
}) => {
  const toggle = useLocalStore(() => ({
    visible: false,
    toggle() {
      this.visible = !this.visible;
    },
  }));

  const members = alertStore.data.getClusterAlertmanagersWithoutReadOnly(
    cluster
  );

  return useObserver(() => (
    <React.Fragment>
      <button
        className="btn btn-danger btn-sm"
        disabled={members.length === 0}
        onClick={() => {
          members.length > 0 && toggle.toggle();
        }}
      >
        <FontAwesomeIcon
          className="mr-1 d-none d-sm-inline-block"
          icon={faTrash}
        />
        Delete
      </button>
      <Modal
        isOpen={toggle.visible}
        isUpper={true}
        toggleOpen={toggle.toggle}
        onExited={onModalExit}
      >
        <DeleteSilenceModalContent
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          cluster={cluster}
          silence={silence}
          onHide={toggle.toggle}
        />
      </Modal>
    </React.Fragment>
  ));
};
DeleteSilence.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  cluster: PropTypes.string.isRequired,
  silence: APISilence.isRequired,
  onModalExit: PropTypes.func,
};

export { DeleteSilence, DeleteSilenceModalContent };

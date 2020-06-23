import React, { useEffect, useState, memo } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons/faCheckCircle";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { APISilenceMatcher } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { useFetchAny } from "Hooks/useFetchAny";

const SilenceSubmitProgress = memo(
  ({ alertStore, cluster, members, payload }) => {
    const [upstreams, setUpstreams] = useState([]);
    const { response, error, inProgress, responseURI } = useFetchAny(upstreams);
    const [publicURIs, setPublicURIs] = useState({});

    useEffect(() => {
      let uris = {};
      let membersToTry = [];
      for (const member of members) {
        if (alertStore.data.isReadOnlyAlertmanager(member)) {
          console.error(`Alertmanager instance "${member}" is read-only`);
        } else {
          const am = alertStore.data.getAlertmanagerByName(member);
          if (am === undefined) {
            console.error(`Alertmanager instance "${member}" not found`);
          } else {
            const uri = `${am.uri}/api/v2/silences`;
            membersToTry.push({
              uri: uri,
              options: {
                method: "POST",
                body: JSON.stringify(payload),
                credentials: am.corsCredentials,
                headers: {
                  "Content-Type": "application/json",
                  ...am.headers,
                },
              },
            });
            uris[uri] = am.publicURI;
          }
        }
      }
      if (membersToTry.length) {
        setPublicURIs(uris);
        setUpstreams(membersToTry);
      }
    }, [alertStore.data, members, payload]);

    return (
      <div className="d-flex mb-2">
        <div className="p-2 flex-fill my-auto flex-grow-0 flex-shrink-0">
          {inProgress ? (
            <FontAwesomeIcon icon={faCircleNotch} spin />
          ) : error ? (
            <FontAwesomeIcon
              icon={faExclamationCircle}
              className="text-danger"
            />
          ) : (
            <FontAwesomeIcon icon={faCheckCircle} className="text-success" />
          )}
        </div>
        <div className="p-2 mr-1 flex-fill my-auto flex-grow-0 flex-shrink-0">
          {cluster}
        </div>
        <div
          className={`p-2 flex-fill flex-grow-1 flex-shrink-1 rounded text-center ${
            error ? "bg-light" : ""
          }`}
        >
          {error ? (
            error
          ) : response && responseURI ? (
            <a
              href={`${publicURIs[responseURI]}/#/silences/${response.silenceID}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {response.silenceID}
            </a>
          ) : null}
        </div>
      </div>
    );
  }
);
SilenceSubmitProgress.propTypes = {
  cluster: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(PropTypes.string).isRequired,
  payload: PropTypes.exact({
    matchers: PropTypes.arrayOf(APISilenceMatcher).isRequired,
    startsAt: PropTypes.string.isRequired,
    endsAt: PropTypes.string.isRequired,
    createdBy: PropTypes.string.isRequired,
    comment: PropTypes.string.isRequired,
    id: PropTypes.string,
  }).isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { SilenceSubmitProgress };

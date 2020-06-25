import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { APISilenceMatcher } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { useFetchAny } from "Hooks/useFetchAny";

const SilenceSubmitProgress = ({
  alertStore,
  silenceFormStore,
  cluster,
  members,
  payload,
}) => {
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

  useEffect(() => {
    if (!inProgress && error !== null) {
      silenceFormStore.data.requestsByCluster[cluster].isDone = true;
      silenceFormStore.data.requestsByCluster[cluster].error = error;
    } else if (!inProgress && response !== null) {
      silenceFormStore.data.requestsByCluster[cluster].isDone = true;
      silenceFormStore.data.requestsByCluster[cluster].silenceID =
        response.silenceID;
      silenceFormStore.data.requestsByCluster[
        cluster
      ].silenceLink = `${publicURIs[responseURI]}/#/silences/${response.silenceID}`;
    }
  }, [cluster, error, inProgress, publicURIs, response, responseURI]); // eslint-disable-line react-hooks/exhaustive-deps

  return <FontAwesomeIcon className="text-muted" icon={faCircleNotch} spin />;
};
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
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

export { SilenceSubmitProgress };

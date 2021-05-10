import { FC, useEffect, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";

import { AlertmanagerSilencePayloadT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { useFetchAny, UpstreamT } from "Hooks/useFetchAny";

interface PostResponseT {
  silenceID: string;
}

const SilenceSubmitProgress: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  cluster: string;
  members: string[];
  payload: AlertmanagerSilencePayloadT;
}> = ({ alertStore, silenceFormStore, cluster, members, payload }) => {
  const [upstreams, setUpstreams] = useState<UpstreamT[]>([]);
  const { response, error, inProgress, responseURI } =
    useFetchAny<PostResponseT>(upstreams);
  const [publicURIs, setPublicURIs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const uris: { [uri: string]: string } = {};
    const membersToTry = [];
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
      silenceFormStore.data.setRequestsByClusterUpdate(cluster, {
        isDone: true,
        error: error,
      });
    } else if (!inProgress && response !== null) {
      silenceFormStore.data.setRequestsByClusterUpdate(cluster, {
        isDone: true,
        silenceID: response.silenceID,
        silenceLink: `${publicURIs[responseURI as string]}/#/silences/${
          response.silenceID
        }`,
      });
    }
  }, [cluster, error, inProgress, publicURIs, response, responseURI]); // eslint-disable-line react-hooks/exhaustive-deps

  return <FontAwesomeIcon className="text-muted" icon={faCircleNotch} spin />;
};

export { SilenceSubmitProgress };

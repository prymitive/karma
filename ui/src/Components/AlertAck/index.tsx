import { FC, useEffect, useState } from "react";

import { toJS } from "mobx";
import { observer } from "mobx-react-lite";

import addSeconds from "date-fns/addSeconds";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import type {
  APIAlertGroupT,
  AlertmanagerSilencePayloadT,
  GroupAlertsRequestT,
  APIAlertT,
} from "Models/APITypes";
import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import {
  SilenceFormStore,
  MatchersFromGroup,
  GenerateAlertmanagerSilenceData,
} from "Stores/SilenceFormStore";
import { useFetchAny, UpstreamT } from "Hooks/useFetchAny";
import { FetchGet } from "Common/Fetch";
import { TooltipWrapper } from "Components/TooltipWrapper";

interface ClusterT {
  payload: AlertmanagerSilencePayloadT;
  clusterName: string;
  members: string[];
}

interface PostResponseT {
  silenceID: string;
}

const generateClusters = (
  alertStore: AlertStore,
  silenceFormStore: SilenceFormStore,
  group: APIAlertGroupT,
  alertList: APIAlertT[]
): ClusterT[] => {
  let author =
    silenceFormStore.data.author !== ""
      ? toJS(silenceFormStore.data.author)
      : toJS(alertStore.settings.values.alertAcknowledgement.author);

  if (alertStore.info.authentication.enabled) {
    silenceFormStore.data.setAuthor(
      toJS(alertStore.info.authentication.username)
    );
    author = alertStore.info.authentication.username;
  }

  const alertmanagers = Object.entries(group.alertmanagerCount)
    .filter(([_, alertCount]) => alertCount > 0)
    .map(([amName, _]) => amName);
  const clusters = Object.entries(
    alertStore.data.clustersWithoutReadOnly
  ).filter(([_, clusterMembers]) =>
    alertmanagers.some((m) => clusterMembers.includes(m))
  );

  const c: ClusterT[] = [];
  for (const [clusterName, clusterMembers] of clusters) {
    const durationSeconds = toJS(
      alertStore.settings.values.alertAcknowledgement.durationSeconds
    );
    const now = new Date();
    const comment = toJS(
      alertStore.settings.values.alertAcknowledgement.comment
    ).replace("%NOW%", now.toUTCString());
    c.push({
      payload: GenerateAlertmanagerSilenceData(
        now,
        addSeconds(now, durationSeconds),
        MatchersFromGroup(group, [], alertList, true),
        author,
        comment
      ),
      clusterName: clusterName,
      members: clusterMembers,
    });
  }
  return c;
};

const AlertAck: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  group: APIAlertGroupT;
}> = observer(({ alertStore, silenceFormStore, group }) => {
  const [clusters, setClusters] = useState<ClusterT[]>([]);
  const [upstreams, setUpstreams] = useState<UpstreamT[]>([]);
  const [currentCluster, setCurrentCluster] = useState<number>(0);
  const [isAcking, setIsAcking] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<APIAlertT[] | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const { response, error, inProgress, reset } =
    useFetchAny<PostResponseT>(upstreams);

  const fetchAlerts = () => {
    const payload: GroupAlertsRequestT = {
      id: group.id,
      alerts: group.alerts.map((a) => a.id),
    };
    FetchGet(
      FormatBackendURI("groupAlerts.json"),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      () => {}
    )
      .then((response) => response.json())
      .then((response) => setAlerts(response))
      .catch((err) => {
        console.trace(err);
        setAlertsError(err.message);
        setIsAcking(false);
      });
  };

  const onACK = () => {
    setIsAcking(true);
    fetchAlerts();
  };

  useEffect(() => {
    if (alerts !== null) {
      setClusters(
        generateClusters(alertStore, silenceFormStore, group, alerts)
      );
    }
  }, [alertStore, silenceFormStore, group, alerts]);

  useEffect(() => {
    if (upstreams.length && !inProgress && (error || response)) {
      if (clusters.length > currentCluster + 1) {
        setCurrentCluster(currentCluster + 1);
      } else {
        setIsAcking(false);
      }
    }
  }, [clusters, upstreams, currentCluster, inProgress, error, response]);

  useEffect(() => {
    if (clusters.length) {
      reset();
      const cluster = clusters[currentCluster];
      const u: UpstreamT[] = [];
      cluster.members.forEach((amName) => {
        const am = alertStore.data.getAlertmanagerByName(amName);
        if (am !== undefined) {
          u.push({
            uri: `${am.uri}/api/v2/silences`,
            options: {
              method: "POST",
              body: JSON.stringify(cluster.payload),
              credentials: am.corsCredentials,
              headers: {
                "Content-Type": "application/json",
                ...am.headers,
              },
            },
          });
        } else {
          console.error(`Alertmanager "${amName}" not found`);
        }
      });
      setUpstreams(u);
    }
  }, [alertStore.data, clusters, currentCluster, reset]);

  useEffect(() => {
    let timer: number;
    if (!isAcking && error) {
      timer = window.setTimeout(() => {
        setUpstreams([]);
        setIsAcking(false);
        reset();
      }, 20 * 1000);
    }
    return () => clearTimeout(timer);
  }, [isAcking, error, reset]);

  return alertStore.settings.values.alertAcknowledgement.enabled ===
    false ? null : (
    <TooltipWrapper
      title={
        !isAcking && (error || alertsError)
          ? error || alertsError
          : "Acknowledge this alert with a short lived silence"
      }
    >
      <span
        className={`badge rounded-pill components-label components-label-with-hover px-2 ${
          !isAcking && (error || alertsError)
            ? "bg-warning"
            : !isAcking && response
            ? "bg-success"
            : "bg-secondary"
        }`}
        onClick={() => {
          if (!isAcking && !(response || error)) {
            onACK();
          }
        }}
      >
        {!isAcking && (error || alertsError) ? (
          <FontAwesomeIcon icon={faExclamationCircle} fixedWidth />
        ) : !isAcking && response ? (
          <FontAwesomeIcon icon={faCheckCircle} fixedWidth />
        ) : isAcking ? (
          <FontAwesomeIcon icon={faSpinner} fixedWidth spin />
        ) : (
          <FontAwesomeIcon icon={faCheck} fixedWidth />
        )}
      </span>
    </TooltipWrapper>
  );
});

export { AlertAck };

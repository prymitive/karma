import React, { FC, useEffect, useState } from "react";

import { toJS } from "mobx";
import { useObserver } from "mobx-react-lite";

import addSeconds from "date-fns/addSeconds";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { APIAlertGroupT, AlertmanagerSilencePayloadT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  MatchersFromGroup,
  GenerateAlertmanagerSilenceData,
} from "Stores/SilenceFormStore";
import { useFetchAny, UpstreamT } from "Hooks/useFetchAny";
import { TooltipWrapper } from "Components/TooltipWrapper";

interface ClusterT {
  payload: AlertmanagerSilencePayloadT;
  clusterName: string;
  members: string[];
}

const AlertAck: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  group: APIAlertGroupT;
}> = ({ alertStore, silenceFormStore, group }) => {
  const [clusters, setClusters] = useState([] as ClusterT[]);
  const [upstreams, setUpstreams] = useState([] as UpstreamT[]);
  const [currentCluster, setCurrentCluster] = useState(0);
  const [isAcking, setIsAcking] = useState(false);

  const { response, error, inProgress, reset } = useFetchAny(upstreams);

  const onACK = () => {
    setIsAcking(true);

    let author =
      silenceFormStore.data.author !== ""
        ? toJS(silenceFormStore.data.author)
        : toJS(alertStore.settings.values.alertAcknowledgement.author);

    if (alertStore.info.authentication.enabled) {
      silenceFormStore.data.author = toJS(
        alertStore.info.authentication.username
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

    let c: ClusterT[] = [];
    for (const [clusterName, clusterMembers] of clusters) {
      const durationSeconds = toJS(
        alertStore.settings.values.alertAcknowledgement.durationSeconds
      );
      const commentPrefix = toJS(
        alertStore.settings.values.alertAcknowledgement.commentPrefix
      );
      const now = new Date();
      c.push({
        payload: GenerateAlertmanagerSilenceData(
          now,
          addSeconds(now, durationSeconds),
          MatchersFromGroup(group, [], group.alerts, true),
          author,
          `${
            commentPrefix ? commentPrefix + " " : ""
          }This alert was acknowledged using karma on ${now.toUTCString()}`
        ),
        clusterName: clusterName,
        members: clusterMembers,
      });
    }
    setClusters(c);
  };

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
      let u: UpstreamT[] = [];
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

  return useObserver(() =>
    alertStore.settings.values.alertAcknowledgement.enabled === false ? null : (
      <TooltipWrapper
        title={
          !isAcking && error
            ? error
            : "Acknowledge this alert with a short lived silence"
        }
      >
        <span
          className={`badge badge-pill components-label components-label-with-hover px-2 ${
            !isAcking && error
              ? "badge-warning"
              : !isAcking && response
              ? "badge-success"
              : "badge-secondary"
          }`}
          onClick={() => {
            if (!isAcking && !(response || error)) {
              setIsAcking(true);
              onACK();
            }
          }}
        >
          {!isAcking && error ? (
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
    )
  );
};

export { AlertAck };

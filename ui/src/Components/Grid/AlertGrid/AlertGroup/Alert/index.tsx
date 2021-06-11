import { FC, useEffect, useRef } from "react";

import { observer } from "mobx-react-lite";

import { useInView } from "react-intersection-observer";

import type {
  APIAlertT,
  APIAlertGroupT,
  APIAlertmanagerStateT,
} from "Models/APITypes";
import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import { BorderClassMap } from "Common/Colors";
import { StaticLabels } from "Common/Query";
import { useFetchGet } from "Hooks/useFetchGet";
import FilteringLabel from "Components/Labels/FilteringLabel";
import { InhibitedByModal } from "Components/InhibitedByModal";
import { RenderNonLinkAnnotation, RenderLinkAnnotation } from "../Annotation";
import { AlertMenu } from "./AlertMenu";
import { RenderSilence } from "../Silences";

const MockAlert: FC = () => {
  return (
    <>
      <span
        className="components-label px-1 me-1 badge bg-secondary"
        style={{ width: "80px" }}
      >
        &nbsp;
      </span>
      <span
        className="components-label badge bg-default components-label-dark"
        style={{ width: "120px" }}
      >
        &nbsp;
      </span>
      <span
        className="components-label badge bg-default components-label-dark"
        style={{ width: "100px" }}
      >
        &nbsp;
      </span>
    </>
  );
};

const GoneAlert: FC = () => {
  return (
    <span className="text-muted p-1 bg-light d-inline-block rounded components-grid-annotation w-100">
      Cannot load alert details: alert is no longer present
    </span>
  );
};

const FailedAlert: FC<{ error: string }> = ({ error }) => {
  return (
    <span className="p-1 bg-danger text-white d-inline-block rounded components-grid-annotation w-100">
      Cannot load alert details: {error}
    </span>
  );
};

const Alert: FC<{
  group: APIAlertGroupT;
  alertID: string;
  alertHash: string;
  showAlertmanagers: boolean;
  showReceiver: boolean;
  showOnlyExpandedAnnotations: boolean;
  afterUpdate: () => void;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  setIsMenuOpen: (isOpen: boolean) => void;
}> = ({
  group,
  alertID,
  alertHash,
  showAlertmanagers,
  showReceiver,
  showOnlyExpandedAnnotations,
  afterUpdate,
  alertStore,
  silenceFormStore,
  setIsMenuOpen,
}) => {
  const [ref, inView] = useInView({
    rootMargin: "600px 0px 0px 0px",
  });
  const hashRef = useRef("");
  const { get, response, error } = useFetchGet<APIAlertT>(
    FormatBackendURI(`alert.json?group=${group.id}&alert=${alertID}`),
    { autorun: false }
  );

  const classNames = [
    "components-grid-alertgrid-alertgroup-alert",
    "list-group-item bg-transparent",
    "ps-1 pe-0 py-0",
    "my-1",
    "rounded-0",
    "border-start-1 border-end-0 border-top-0 border-bottom-0",
    BorderClassMap[response ? response.state : "unprocessed"] ||
      "border-default",
  ];

  const silences: {
    [cluster: string]: {
      alertmanager: APIAlertmanagerStateT;
      silences: string[];
    };
  } = {};
  const clusters: string[] = [];
  const inhibitedBy: string[] = [];

  if (response && response.id) {
    for (const am of response.alertmanager) {
      if (!clusters.includes(am.cluster)) {
        clusters.push(am.cluster);
      }
      for (const fingerprint of am.inhibitedBy) {
        if (!inhibitedBy.includes(fingerprint)) {
          inhibitedBy.push(fingerprint);
        }
      }
      if (!silences[am.cluster]) {
        silences[am.cluster] = {
          alertmanager: am,
          silences: Array.from(
            new Set(
              am.silencedBy.filter(
                (silenceID) =>
                  !(
                    group.shared.silences[am.cluster] &&
                    group.shared.silences[am.cluster].includes(silenceID)
                  )
              )
            )
          ),
        };
      }
    }
  }

  useEffect(() => {
    if (!inView || hashRef.current === alertHash) {
      return;
    }
    hashRef.current = alertHash;
    get();
  }, [inView, alertID, alertHash, get]);

  useEffect(() => {
    afterUpdate();
  });

  return (
    <li ref={ref} className={classNames.join(" ")}>
      {error ? (
        <FailedAlert error={error} />
      ) : response ? (
        response.id === "" ? (
          <GoneAlert />
        ) : (
          <>
            <div>
              {response.annotations
                .filter((a) => a.isLink === false)
                .filter(
                  (a) => a.visible === true || !showOnlyExpandedAnnotations
                )
                .map((a) => (
                  <RenderNonLinkAnnotation
                    key={a.name}
                    name={a.name}
                    value={a.value}
                    visible={a.visible}
                    allowHTML={alertStore.settings.values.annotationsEnableHTML}
                    afterUpdate={afterUpdate}
                  />
                ))}
            </div>
            <AlertMenu
              group={group}
              alert={response}
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              setIsMenuOpen={setIsMenuOpen}
            />
            {inhibitedBy.length > 0 ? (
              <InhibitedByModal
                alertStore={alertStore}
                fingerprints={inhibitedBy}
              />
            ) : null}
            {Object.entries(response.labels).map(([name, value]) => (
              <FilteringLabel
                key={name}
                name={name}
                value={value}
                alertStore={alertStore}
              />
            ))}
            {showAlertmanagers
              ? clusters.map((cluster) => (
                  <FilteringLabel
                    key={cluster}
                    name={StaticLabels.AlertmanagerCluster}
                    value={cluster}
                    alertStore={alertStore}
                  />
                ))
              : null}
            {showReceiver ? (
              <FilteringLabel
                name={StaticLabels.Receiver}
                value={response.receiver}
                alertStore={alertStore}
              />
            ) : null}
            {response.annotations
              .filter((a) => a.isLink === true)
              .filter((a) => a.isAction === false)
              .map((a) => (
                <RenderLinkAnnotation
                  key={a.name}
                  name={a.name}
                  value={a.value}
                />
              ))}
            {Object.entries(silences).map(([cluster, clusterSilences]) =>
              clusterSilences.silences.map((silenceID) => (
                <RenderSilence
                  key={silenceID}
                  alertStore={alertStore}
                  silenceFormStore={silenceFormStore}
                  afterUpdate={afterUpdate}
                  cluster={cluster}
                  silenceID={silenceID}
                />
              ))
            )}
          </>
        )
      ) : (
        <MockAlert />
      )}
    </li>
  );
};

export default observer(Alert);

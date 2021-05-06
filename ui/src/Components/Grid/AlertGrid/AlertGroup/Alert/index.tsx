import { FC } from "react";

import { observer } from "mobx-react-lite";

import {
  APIAlertT,
  APIAlertGroupT,
  APIAlertmanagerStateT,
} from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { BorderClassMap } from "Common/Colors";
import { StaticLabels } from "Common/Query";
import FilteringLabel from "Components/Labels/FilteringLabel";
import { InhibitedByModal } from "Components/InhibitedByModal";
import { RenderNonLinkAnnotation, RenderLinkAnnotation } from "../Annotation";
import { AlertMenu } from "./AlertMenu";
import { RenderSilence } from "../Silences";

const Alert: FC<{
  group: APIAlertGroupT;
  alert: APIAlertT;
  showAlertmanagers: boolean;
  showReceiver: boolean;
  showOnlyExpandedAnnotations: boolean;
  afterUpdate: () => void;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  setIsMenuOpen: (isOpen: boolean) => void;
}> = ({
  group,
  alert,
  showAlertmanagers,
  showReceiver,
  showOnlyExpandedAnnotations,
  afterUpdate,
  alertStore,
  silenceFormStore,
  setIsMenuOpen,
}) => {
  const classNames = [
    "components-grid-alertgrid-alertgroup-alert",
    "list-group-item bg-transparent",
    "ps-1 pe-0 py-0",
    "my-1",
    "rounded-0",
    "border-start-1 border-end-0 border-top-0 border-bottom-0",
    BorderClassMap[alert.state] || "border-default",
  ];

  const silences: {
    [cluster: string]: {
      alertmanager: APIAlertmanagerStateT;
      silences: string[];
    };
  } = {};
  const clusters: string[] = [];
  const inhibitedBy: string[] = [];
  for (const am of alert.alertmanager) {
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

  return (
    <li className={classNames.join(" ")}>
      <div>
        {alert.annotations
          .filter((a) => a.isLink === false)
          .filter((a) => a.visible === true || !showOnlyExpandedAnnotations)
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
        alert={alert}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        setIsMenuOpen={setIsMenuOpen}
      />
      {inhibitedBy.length > 0 ? (
        <InhibitedByModal alertStore={alertStore} fingerprints={inhibitedBy} />
      ) : null}
      {Object.entries(alert.labels).map(([name, value]) => (
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
          value={alert.receiver}
          alertStore={alertStore}
        />
      ) : null}
      {alert.annotations
        .filter((a) => a.isLink === true)
        .filter((a) => a.isAction === false)
        .map((a) => (
          <RenderLinkAnnotation key={a.name} name={a.name} value={a.value} />
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
    </li>
  );
};

export default observer(Alert);

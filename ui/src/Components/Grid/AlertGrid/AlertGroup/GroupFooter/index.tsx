import type { FC } from "react";

import { observer } from "mobx-react-lite";

import type { APIAlertGroupT } from "Models/APITypes";
import { StaticLabels } from "Common/Query";
import type { AlertStore } from "Stores/AlertStore";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import FilteringLabel from "Components/Labels/FilteringLabel";
import { RenderNonLinkAnnotation, RenderLinkAnnotation } from "../Annotation";
import { RenderSilence } from "../Silences";

const GroupFooter: FC<{
  group: APIAlertGroupT;
  afterUpdate: () => void;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  showAnnotations?: boolean;
  showSilences?: boolean;
  showReceiver?: boolean;
}> = ({
  group,
  afterUpdate,
  alertStore,
  silenceFormStore,
  showAnnotations = true,
  showSilences = true,
  showReceiver = true,
}) => {
  const total =
    (showAnnotations
      ? group.shared.annotations.filter((a) => a.isLink === false).length +
        group.shared.annotations
          .filter((a) => a.isLink === true)
          .filter((a) => a.isAction === false).length
      : 0) +
    group.shared.labels.length +
    (Object.keys(alertStore.data.upstreams.clusters).length > 1
      ? group.shared.clusters.length
      : 0) +
    (alertStore.data.receivers.length > 1 ? (showReceiver ? 1 : 0) : 0) +
    (showSilences ? Object.keys(group.shared.silences).length : 0);
  if (total === 0) {
    return null;
  }

  return (
    <div className="card-footer components-grid-alertgrid-alertgroup-footer px-2 py-1">
      <div className="mb-1">
        {showAnnotations
          ? group.shared.annotations
              .filter((a) => a.isLink === false)
              .map((a) => (
                <RenderNonLinkAnnotation
                  key={a.name}
                  name={a.name}
                  value={a.value}
                  visible={a.visible}
                  allowHTML={alertStore.settings.values.annotationsEnableHTML}
                  afterUpdate={afterUpdate}
                />
              ))
          : null}
      </div>
      {group.shared.labels.map((label) => (
        <FilteringLabel
          key={label.name}
          name={label.name}
          value={label.value}
          alertStore={alertStore}
        />
      ))}
      {Object.keys(alertStore.data.upstreams.clusters).length > 1
        ? group.shared.clusters.map((cluster) => (
            <FilteringLabel
              key={cluster}
              name={StaticLabels.AlertmanagerCluster}
              value={cluster}
              alertStore={alertStore}
            />
          ))
        : null}
      {alertStore.data.receivers.length > 1 ? (
        <FilteringLabel
          name={StaticLabels.Receiver}
          value={group.receiver}
          alertStore={alertStore}
        />
      ) : null}
      {showAnnotations
        ? group.shared.annotations
            .filter((a) => a.isLink === true)
            .filter((a) => a.isAction === false)
            .map((a) => (
              <RenderLinkAnnotation
                key={a.name}
                name={a.name}
                value={a.value}
              />
            ))
        : null}
      {Object.keys(group.shared.silences).length === 0 ? null : showSilences ? (
        <div className="components-grid-alertgrid-alertgroup-shared-silence rounded-0 border-0">
          {Object.entries(group.shared.silences).map(([cluster, silences]) =>
            silences.map((silenceID) => (
              <RenderSilence
                key={silenceID}
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
                afterUpdate={afterUpdate}
                cluster={cluster}
                silenceID={silenceID}
              />
            )),
          )}
        </div>
      ) : null}
    </div>
  );
};

export default observer(GroupFooter);

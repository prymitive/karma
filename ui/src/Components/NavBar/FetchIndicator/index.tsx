import React, { FC } from "react";

import { useObserver } from "mobx-react-lite";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faPauseCircle } from "@fortawesome/free-regular-svg-icons/faPauseCircle";

import { AlertStore, AlertStoreStatuses } from "Stores/AlertStore";

const FetchIcon: FC<{
  icon: IconDefinition;
  color?: string;
  visible?: boolean;
  spin?: boolean;
}> = ({ icon, color = "muted", visible = true, spin = false }) => (
  <FontAwesomeIcon
    style={{ opacity: visible ? 1 : 0 }}
    className={`mx-1 text-${color}`}
    size="lg"
    icon={icon}
    spin={spin}
  />
);

const FetchIndicator: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
  return useObserver(() =>
    alertStore.status.paused ? (
      <FetchIcon icon={faPauseCircle} />
    ) : alertStore.status.value.toString() ===
      AlertStoreStatuses.Fetching.toString() ? (
      <FetchIcon
        icon={faCircleNotch}
        color={alertStore.info.isRetrying ? "danger" : "muted"}
        spin
      />
    ) : alertStore.status.value.toString() ===
      AlertStoreStatuses.Processing.toString() ? (
      <FetchIcon icon={faCircleNotch} color="success" spin />
    ) : (
      <FetchIcon icon={faCircleNotch} visible={false} />
    )
  );
};

export { FetchIndicator };

import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faPauseCircle } from "@fortawesome/free-regular-svg-icons/faPauseCircle";

import { AlertStore, AlertStoreStatuses } from "Stores/AlertStore";

const FetchIcon = ({ icon, color, visible, spin }) => (
  <FontAwesomeIcon
    style={{ opacity: visible ? 1 : 0 }}
    className={`mx-1 text-${color}`}
    size="lg"
    icon={icon}
    spin={spin}
  />
);
FetchIcon.propTypes = {
  icon: FontAwesomeIcon.propTypes.icon.isRequired,
  color: PropTypes.string,
  visible: PropTypes.bool,
  spin: PropTypes.bool,
};
FetchIcon.defaultProps = {
  color: "muted",
  visible: true,
  spin: false,
};

const FetchIndicator = ({ alertStore }) => {
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
FetchIndicator.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { FetchIndicator };

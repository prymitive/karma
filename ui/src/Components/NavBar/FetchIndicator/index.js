import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

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

const FetchIndicator = observer(
  class FetchIndicator extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
    };

    render() {
      const { alertStore } = this.props;

      if (alertStore.status.paused) return <FetchIcon icon={faPauseCircle} />;

      const status = alertStore.status.value.toString();

      if (status === AlertStoreStatuses.Fetching.toString())
        return (
          <FetchIcon
            icon={faCircleNotch}
            color={alertStore.info.isRetrying ? "danger" : "muted"}
            spin
          />
        );

      if (status === AlertStoreStatuses.Processing.toString())
        return <FetchIcon icon={faCircleNotch} color="success" spin />;

      return <FetchIcon icon={faCircleNotch} visible={false} />;
    }
  }
);

export { FetchIndicator };

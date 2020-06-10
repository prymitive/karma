import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import { autorun } from "mobx";
import { useObserver } from "mobx-react-lite";

import Favico from "favico.js";

import { AlertStore } from "Stores/AlertStore";

const FaviconBadge = ({ alertStore }) => {
  const [favico] = useState(
    new Favico({
      animation: "none",
      position: "down",
      bgColor: "#e74c3c",
      textColor: "#fff",
      fontStyle: "lighter",
    })
  );

  useEffect(
    () =>
      autorun(() => {
        if (alertStore.status.error !== null) {
          favico.badge("?");
        } else {
          favico.badge(alertStore.info.totalAlerts);
        }
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return useObserver(() => (
    <span
      data-total-alerts={alertStore.info.totalAlerts}
      data-status-error={alertStore.status.error}
    />
  ));
};
FaviconBadge.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { FaviconBadge };

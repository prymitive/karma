import React, { useState, useEffect, FC } from "react";

import { autorun } from "mobx";
import { useObserver } from "mobx-react-lite";

import Favico from "favico.js";

import { AlertStore } from "Stores/AlertStore";

const FaviconBadge: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
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

export { FaviconBadge };

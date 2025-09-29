import { useEffect } from "react";

import { autorun } from "mobx";

import type { AlertStore } from "Stores/AlertStore";
import { notificationStore } from "Stores/NotificationStore";

import Favico from "favico.js";

const FaviconBadge = ({ alertStore }: { alertStore: AlertStore }) => {
  useEffect(() => {
    const favico = new Favico({
      animation: "none",
    });

    const dispose = autorun(() =>
      autorun(() => {
        // Priority: critical notifications > network errors > alert count
        const criticalCount = notificationStore.errorCount;
        const warningCount = notificationStore.warningCount;

        let badge;
        if (criticalCount > 0) {
          badge = "!";
        } else if (warningCount > 0) {
          badge = "⚠";
        } else if (alertStore.status.error !== null) {
          badge = "?";
        } else {
          badge = alertStore.info.totalAlerts;
        }

        favico.badge(badge);
      }),
    );

    return dispose;
  }, [alertStore]);

  return null;
};

export { FaviconBadge };
export default FaviconBadge;

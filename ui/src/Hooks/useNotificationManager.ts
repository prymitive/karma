import { useEffect } from "react";
import { autorun } from "mobx";

import type { AlertStore } from "Stores/AlertStore";
import type { APIAlertmanagerUpstreamT } from "Models/APITypes";
import { notificationStore } from "Stores/NotificationStore";

export const useNotificationManager = (alertStore: AlertStore) => {
  useEffect(() => {
    const dispose = autorun(() => {
      // Handle cluster-level critical errors (all instances in cluster failing)
      const criticalClusters = alertStore.data.clustersWithErrors;
      const warningClusters = alertStore.data.clustersWithWarnings;

      // Add critical error notifications for clusters where all instances are failing
      criticalClusters.forEach((cluster: string) => {
        const failingInstances =
          alertStore.data.upstreamsWithCriticalErrors.filter(
            (u: APIAlertmanagerUpstreamT) => u.cluster === cluster,
          );

        if (failingInstances.length > 0) {
          const instanceNames = failingInstances
            .map(
              (u: APIAlertmanagerUpstreamT) =>
                `<code class="bg-secondary text-white px-1 rounded">${u.name}</code>`,
            )
            .join(", ");
          const message =
            failingInstances.length === 1
              ? `The only instance in cluster <code class="bg-secondary text-white px-1 rounded">${cluster}</code> is failing: ${instanceNames}`
              : `All ${failingInstances.length} Alertmanager instances in cluster <code class="bg-secondary text-white px-1 rounded">${cluster}</code> are failing: ${instanceNames}`;

          notificationStore.addNotification({
            type: "error",
            title: `Cluster <code class="bg-secondary text-white px-1 rounded">${cluster}</code> is unreachable`,
            message,
            source: "alertmanager",
            sourceId: `cluster-${cluster}`,
          });
        }
      });

      // Add warning notifications for clusters with partial failures
      warningClusters.forEach((cluster: string) => {
        const failingInstances = alertStore.data.upstreamsWithWarnings.filter(
          (u: APIAlertmanagerUpstreamT) => u.cluster === cluster,
        );
        const clusterInstances = alertStore.data.upstreams.instances.filter(
          (u: APIAlertmanagerUpstreamT) => u.cluster === cluster,
        );

        if (failingInstances.length > 0) {
          notificationStore.addNotification({
            type: "warning",
            title: `Partial outage in cluster <code class="bg-secondary text-white px-1 rounded">${cluster}</code>`,
            message: `${failingInstances.length} of ${clusterInstances.length} Alertmanager instances failing: ${failingInstances.map((u: APIAlertmanagerUpstreamT) => `<code class="bg-secondary text-white px-1 rounded">${u.name}</code>`).join(", ")}`,
            source: "alertmanager",
            sourceId: `cluster-${cluster}`,
          });
        }
      });

      // Auto-dismiss resolved notifications
      const healthyClusters = Object.keys(
        alertStore.data.upstreams.clusters,
      ).filter(
        (cluster) =>
          !criticalClusters.includes(cluster) &&
          !warningClusters.includes(cluster),
      );

      healthyClusters.forEach((cluster: string) => {
        // Auto-dismiss notifications for clusters that are now healthy
        notificationStore.dismissAllBySource(
          "alertmanager",
          `cluster-${cluster}`,
          true,
        );
      });
    });

    return dispose;
  }, [alertStore]);

  return notificationStore;
};

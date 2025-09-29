import { renderHook } from "@testing-library/react-hooks";

import { AlertStore } from "Stores/AlertStore";
import { notificationStore } from "Stores/NotificationStore";
import { useNotificationManager } from "./useNotificationManager";

let alertStore: AlertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  // Clear all notifications
  notificationStore.activeNotifications.forEach((n) =>
    notificationStore.dismissNotification(n.id),
  );
  notificationStore.clearDismissed();
});

const createUpstreamInstance = (name: string, cluster: string, error = "") => ({
  name,
  cluster,
  clusterMembers: [name],
  uri: `http://${name}`,
  publicURI: `http://${name}`,
  error,
  version: "0.24.0",
  readonly: false,
  corsCredentials: "include" as const,
  headers: {},
});

describe("useNotificationManager", () => {
  it("returns the notification store", () => {
    const { result } = renderHook(() => useNotificationManager(alertStore));
    expect(result.current).toBe(notificationStore);
  });

  it("creates error notifications for clusters with all instances failing", () => {
    // Set up upstream data with all instances in cluster failing
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 0, failed: 2 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
      ],
    });

    renderHook(() => useNotificationManager(alertStore));

    // Should create error notification for cluster
    const activeNotifications = notificationStore.activeNotifications;
    expect(activeNotifications).toHaveLength(1);
    expect(activeNotifications[0].type).toBe("error");
    expect(activeNotifications[0].title).toBe(
      'Cluster <code class="bg-secondary text-white px-1 rounded">cluster-1</code> is unreachable',
    );
    expect(activeNotifications[0].message).toBe(
      'All 2 Alertmanager instances in cluster <code class="bg-secondary text-white px-1 rounded">cluster-1</code> are failing: <code class="bg-secondary text-white px-1 rounded">am1</code>, <code class="bg-secondary text-white px-1 rounded">am2</code>',
    );
    expect(activeNotifications[0].source).toBe("alertmanager");
    expect(activeNotifications[0].sourceId).toBe("cluster-cluster-1");
  });

  it("creates appropriate message for single instance cluster failure", () => {
    // Set up upstream data with single instance cluster failing
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      clusters: { "cluster-1": ["am1"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
      ],
    });

    renderHook(() => useNotificationManager(alertStore));

    const activeNotifications = notificationStore.activeNotifications;
    expect(activeNotifications).toHaveLength(1);
    expect(activeNotifications[0].message).toBe(
      'The only instance in cluster <code class="bg-secondary text-white px-1 rounded">cluster-1</code> is failing: <code class="bg-secondary text-white px-1 rounded">am1</code>',
    );
  });

  it("creates warning notifications for clusters with partial failures", () => {
    // Set up upstream data with partial cluster failure
    alertStore.data.setUpstreams({
      counters: { total: 3, healthy: 1, failed: 2 },
      clusters: { "cluster-1": ["am1", "am2", "am3"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
        createUpstreamInstance("am3", "cluster-1"), // healthy
      ],
    });

    renderHook(() => useNotificationManager(alertStore));

    const activeNotifications = notificationStore.activeNotifications;
    expect(activeNotifications).toHaveLength(1);
    expect(activeNotifications[0].type).toBe("warning");
    expect(activeNotifications[0].title).toBe(
      'Partial outage in cluster <code class="bg-secondary text-white px-1 rounded">cluster-1</code>',
    );
    expect(activeNotifications[0].message).toBe(
      '2 of 3 Alertmanager instances failing: <code class="bg-secondary text-white px-1 rounded">am1</code>, <code class="bg-secondary text-white px-1 rounded">am2</code>',
    );
    expect(activeNotifications[0].source).toBe("alertmanager");
    expect(activeNotifications[0].sourceId).toBe("cluster-cluster-1");
  });

  it("handles multiple clusters with different failure states", () => {
    // Set up multiple clusters
    alertStore.data.setUpstreams({
      counters: { total: 5, healthy: 2, failed: 3 },
      clusters: {
        "cluster-1": ["am1", "am2"],
        "cluster-2": ["am3", "am4", "am5"],
      },
      instances: [
        // Cluster 1: all failing (critical)
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
        // Cluster 2: partial failure (warning)
        createUpstreamInstance("am3", "cluster-2", "connection failed"),
        createUpstreamInstance("am4", "cluster-2"), // healthy
        createUpstreamInstance("am5", "cluster-2"), // healthy
      ],
    });

    renderHook(() => useNotificationManager(alertStore));

    const activeNotifications = notificationStore.activeNotifications;
    expect(activeNotifications).toHaveLength(2);

    // Should have one error and one warning
    const errorNotification = activeNotifications.find(
      (n) => n.type === "error",
    );

    expect(errorNotification).toBeDefined();
    expect(errorNotification).toEqual(
      expect.objectContaining({
        title:
          'Cluster <code class="bg-secondary text-white px-1 rounded">cluster-1</code> is unreachable',
      }),
    );

    const warningNotification = activeNotifications.find(
      (n) => n.type === "warning",
    );

    expect(warningNotification).toBeDefined();
    expect(warningNotification).toEqual(
      expect.objectContaining({
        title:
          'Partial outage in cluster <code class="bg-secondary text-white px-1 rounded">cluster-2</code>',
      }),
    );
  });

  it("auto-dismisses notifications when clusters become healthy", () => {
    // Start with failing cluster
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 0, failed: 2 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
      ],
    });

    const { rerender } = renderHook(() => useNotificationManager(alertStore));

    // Should have error notification
    expect(notificationStore.activeNotifications).toHaveLength(1);

    // Update to healthy cluster
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1"),
        createUpstreamInstance("am2", "cluster-1"),
      ],
    });

    rerender();

    // Notification should be auto-dismissed
    expect(notificationStore.activeNotifications).toHaveLength(0);
    expect(notificationStore.dismissedNotifications).toHaveLength(1);
    expect(notificationStore.dismissedNotifications[0].autoDismissed).toBe(
      true,
    );
  });

  it("updates existing notifications when cluster state changes", () => {
    // Start with all instances failing (critical)
    alertStore.data.setUpstreams({
      counters: { total: 3, healthy: 0, failed: 3 },
      clusters: { "cluster-1": ["am1", "am2", "am3"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
        createUpstreamInstance("am3", "cluster-1", "connection failed"),
      ],
    });

    const { rerender } = renderHook(() => useNotificationManager(alertStore));

    // Should have error notification
    expect(notificationStore.activeNotifications).toHaveLength(1);
    expect(notificationStore.activeNotifications[0].type).toBe("error");

    // Change to partial failure (warning)
    alertStore.data.setUpstreams({
      counters: { total: 3, healthy: 1, failed: 2 },
      clusters: { "cluster-1": ["am1", "am2", "am3"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
        createUpstreamInstance("am3", "cluster-1"), // now healthy
      ],
    });

    rerender();

    // Should update to warning notification
    expect(notificationStore.activeNotifications).toHaveLength(1);
    expect(notificationStore.activeNotifications[0].type).toBe("warning");
    expect(notificationStore.activeNotifications[0].title).toBe(
      'Partial outage in cluster <code class="bg-secondary text-white px-1 rounded">cluster-1</code>',
    );
  });

  it("handles empty cluster data gracefully", () => {
    alertStore.data.setUpstreams({
      counters: { total: 0, healthy: 0, failed: 0 },
      clusters: {},
      instances: [],
    });

    renderHook(() => useNotificationManager(alertStore));

    expect(notificationStore.activeNotifications).toHaveLength(0);
  });

  it("ignores clusters with no failing instances", () => {
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1"),
        createUpstreamInstance("am2", "cluster-1"),
      ],
    });

    renderHook(() => useNotificationManager(alertStore));

    expect(notificationStore.activeNotifications).toHaveLength(0);
  });

  it("cleanup disposes autorun when hook unmounts", () => {
    const { unmount } = renderHook(() => useNotificationManager(alertStore));

    // Add notification
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      clusters: { "cluster-1": ["am1"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
      ],
    });

    expect(notificationStore.activeNotifications).toHaveLength(1);

    // Unmount hook
    unmount();

    // Further changes shouldn't create new notifications
    const previousCount = notificationStore.activeNotifications.length;

    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 0, failed: 2 },
      clusters: { "cluster-2": ["am2", "am3"] },
      instances: [
        createUpstreamInstance("am2", "cluster-2", "connection failed"),
        createUpstreamInstance("am3", "cluster-2", "connection failed"),
      ],
    });

    // Should still have same count as autorun was disposed
    expect(notificationStore.activeNotifications).toHaveLength(previousCount);
  });

  it("handles clusters with mixed readonly and readwrite instances", () => {
    alertStore.data.setUpstreams({
      counters: { total: 3, healthy: 1, failed: 2 },
      clusters: { "cluster-1": ["am1", "am2", "am3"] },
      instances: [
        {
          ...createUpstreamInstance("am1", "cluster-1", "connection failed"),
          readonly: true,
        },
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
        createUpstreamInstance("am3", "cluster-1"), // healthy
      ],
    });

    renderHook(() => useNotificationManager(alertStore));

    // Should still create warning notification
    const activeNotifications = notificationStore.activeNotifications;
    expect(activeNotifications).toHaveLength(1);
    expect(activeNotifications[0].type).toBe("warning");
  });

  it("handles notification updates correctly when cluster changes", () => {
    // Start with critical error
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 0, failed: 2 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1", "connection failed"),
      ],
    });

    const { rerender } = renderHook(() => useNotificationManager(alertStore));

    expect(notificationStore.activeNotifications).toHaveLength(1);
    expect(notificationStore.activeNotifications[0].type).toBe("error");

    // Update to partial failure - should update same notification
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 1, failed: 1 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "connection failed"),
        createUpstreamInstance("am2", "cluster-1"), // now healthy
      ],
    });

    rerender();

    // Should still have one notification but type changed
    expect(notificationStore.activeNotifications).toHaveLength(1);
    expect(notificationStore.activeNotifications[0].type).toBe("warning");
    expect(notificationStore.activeNotifications[0].sourceId).toBe(
      "cluster-cluster-1",
    );
  });

  it("handles zero counters gracefully", () => {
    alertStore.data.setUpstreams({
      counters: { total: 0, healthy: 0, failed: 0 },
      clusters: {},
      instances: [],
    });

    renderHook(() => useNotificationManager(alertStore));

    expect(notificationStore.activeNotifications).toHaveLength(0);
  });

  it("handles single cluster with single instance failure", () => {
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      clusters: { "solo-cluster": ["am-solo"] },
      instances: [createUpstreamInstance("am-solo", "solo-cluster", "failed")],
    });

    renderHook(() => useNotificationManager(alertStore));

    const activeNotifications = notificationStore.activeNotifications;
    expect(activeNotifications).toHaveLength(1);
    expect(activeNotifications[0].type).toBe("error");
    expect(activeNotifications[0].message).toContain("only instance");
  });

  it("properly handles cluster recovery and re-failure", () => {
    const { rerender } = renderHook(() => useNotificationManager(alertStore));

    // Start healthy
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1"),
        createUpstreamInstance("am2", "cluster-1"),
      ],
    });

    rerender();
    expect(notificationStore.activeNotifications).toHaveLength(0);

    // Fail completely
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 0, failed: 2 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "failed"),
        createUpstreamInstance("am2", "cluster-1", "failed"),
      ],
    });

    rerender();
    expect(notificationStore.activeNotifications).toHaveLength(1);
    expect(notificationStore.activeNotifications[0].type).toBe("error");

    // Recover
    alertStore.data.setUpstreams({
      counters: { total: 2, healthy: 2, failed: 0 },
      clusters: { "cluster-1": ["am1", "am2"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1"),
        createUpstreamInstance("am2", "cluster-1"),
      ],
    });

    rerender();
    expect(notificationStore.activeNotifications).toHaveLength(0);
    expect(notificationStore.dismissedNotifications).toHaveLength(1);
    expect(notificationStore.dismissedNotifications[0].autoDismissed).toBe(
      true,
    );
  });

  it("integrates with occurrence count feature - dismissed notifications get incremented instead of new active notifications", () => {
    const { rerender } = renderHook(() => useNotificationManager(alertStore));

    // Initial cluster failure
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      clusters: { "cluster-1": ["am1"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "Connection failed"),
      ],
    });

    rerender();

    // Should create error notification
    expect(notificationStore.activeNotifications).toHaveLength(1);
    const originalNotification = notificationStore.activeNotifications[0];
    expect(originalNotification.occurrenceCount).toBe(1);
    expect(originalNotification.sourceId).toBe("cluster-cluster-1");

    // User manually dismisses the notification
    notificationStore.dismissNotification(originalNotification.id);
    expect(notificationStore.activeNotifications).toHaveLength(0);
    expect(notificationStore.dismissedNotifications).toHaveLength(1);
    expect(notificationStore.dismissedNotifications[0].occurrenceCount).toBe(1);

    // Cluster fails again with same error - should increment dismissed notification count
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      clusters: { "cluster-1": ["am1"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "Connection failed"),
      ],
    });

    rerender();

    // Should NOT create new active notification
    expect(notificationStore.activeNotifications).toHaveLength(0);

    // Should increment occurrence count on dismissed notification
    expect(notificationStore.dismissedNotifications).toHaveLength(1);
    expect(notificationStore.dismissedNotifications[0].occurrenceCount).toBe(2);

    // Cluster fails again - should increment count further
    alertStore.data.setUpstreams({
      counters: { total: 1, healthy: 0, failed: 1 },
      clusters: { "cluster-1": ["am1"] },
      instances: [
        createUpstreamInstance("am1", "cluster-1", "Connection failed"),
      ],
    });

    rerender();

    expect(notificationStore.activeNotifications).toHaveLength(0);
    expect(notificationStore.dismissedNotifications[0].occurrenceCount).toBe(3);
  });
});

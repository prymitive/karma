import { NotificationStore } from "./NotificationStore";

let store: NotificationStore;

beforeEach(() => {
  store = new NotificationStore();
});

describe("NotificationStore", () => {
  describe("addNotification", () => {
    it("adds a new notification", () => {
      store.addNotification({
        type: "error",
        title: "Test Error",
        message: "Test message",
        source: "alertmanager",
        sourceId: "test-1",
      });

      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].type).toBe("error");
      expect(store.notifications[0].title).toBe("Test Error");
      expect(store.notifications[0].message).toBe("Test message");
      expect(store.notifications[0].source).toBe("alertmanager");
      expect(store.notifications[0].sourceId).toBe("test-1");
      expect(store.notifications[0].dismissed).toBe(false);
      expect(store.notifications[0].autoDismissed).toBe(false);
      expect(store.notifications[0].id).toBeDefined();
      expect(store.notifications[0].timestamp).toBeInstanceOf(Date);
    });

    it("updates existing notification with same source and sourceId", () => {
      // Add first notification
      store.addNotification({
        type: "error",
        title: "First Error",
        message: "First message",
        source: "alertmanager",
        sourceId: "test-1",
      });

      // Add second notification with same source and sourceId
      store.addNotification({
        type: "warning",
        title: "Updated Error",
        message: "Updated message",
        source: "alertmanager",
        sourceId: "test-1",
      });

      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].type).toBe("warning");
      expect(store.notifications[0].title).toBe("Updated Error");
      expect(store.notifications[0].message).toBe("Updated message");
    });

    it("keeps notifications with different sourceId separate", () => {
      store.addNotification({
        type: "error",
        title: "Error 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "test-1",
      });

      store.addNotification({
        type: "error",
        title: "Error 2",
        message: "Message 2",
        source: "alertmanager",
        sourceId: "test-2",
      });

      expect(store.notifications).toHaveLength(2);
    });

    it("keeps only last 50 notifications", () => {
      // Add 55 notifications
      for (let i = 0; i < 55; i++) {
        store.addNotification({
          type: "error",
          title: `Error ${i}`,
          message: `Message ${i}`,
          source: "alertmanager",
          sourceId: `test-${i}`,
        });
      }

      expect(store.notifications).toHaveLength(50);
      expect(store.notifications[0].title).toBe("Error 5");
      expect(store.notifications[49].title).toBe("Error 54");
    });
  });

  describe("dismissNotification", () => {
    it("dismisses a notification by id", () => {
      store.addNotification({
        type: "error",
        title: "Test Error",
        message: "Test message",
        source: "alertmanager",
        sourceId: "test-1",
      });

      const id = store.notifications[0].id;
      store.dismissNotification(id);

      expect(store.notifications[0].dismissed).toBe(true);
      expect(store.notifications[0].autoDismissed).toBe(false);
    });

    it("marks notification as auto-dismissed when specified", () => {
      store.addNotification({
        type: "error",
        title: "Test Error",
        message: "Test message",
        source: "alertmanager",
        sourceId: "test-1",
      });

      const id = store.notifications[0].id;
      store.dismissNotification(id, true);

      expect(store.notifications[0].dismissed).toBe(true);
      expect(store.notifications[0].autoDismissed).toBe(true);
    });

    it("does nothing for non-existent id", () => {
      store.addNotification({
        type: "error",
        title: "Test Error",
        message: "Test message",
        source: "alertmanager",
        sourceId: "test-1",
      });

      store.dismissNotification("non-existent");

      expect(store.notifications[0].dismissed).toBe(false);
    });
  });

  describe("dismissAllBySource", () => {
    it("dismisses all notifications by source", () => {
      store.addNotification({
        type: "error",
        title: "Error 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "test-1",
      });

      store.addNotification({
        type: "error",
        title: "Error 2",
        message: "Message 2",
        source: "alertmanager",
        sourceId: "test-2",
      });

      store.addNotification({
        type: "error",
        title: "Error 3",
        message: "Message 3",
        source: "system",
        sourceId: "test-3",
      });

      store.dismissAllBySource("alertmanager");

      expect(store.notifications[0].dismissed).toBe(true);
      expect(store.notifications[1].dismissed).toBe(true);
      expect(store.notifications[2].dismissed).toBe(false);
    });

    it("dismisses notifications by source and sourceId", () => {
      store.addNotification({
        type: "error",
        title: "Error 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "cluster-1",
      });

      store.addNotification({
        type: "error",
        title: "Error 2",
        message: "Message 2",
        source: "alertmanager",
        sourceId: "cluster-2",
      });

      store.dismissAllBySource("alertmanager", "cluster-1");

      expect(store.notifications[0].dismissed).toBe(true);
      expect(store.notifications[1].dismissed).toBe(false);
    });

    it("marks notifications as auto-dismissed when specified", () => {
      store.addNotification({
        type: "error",
        title: "Error 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "test-1",
      });

      store.dismissAllBySource("alertmanager", undefined, true);

      expect(store.notifications[0].dismissed).toBe(true);
      expect(store.notifications[0].autoDismissed).toBe(true);
    });
  });

  describe("clearDismissed", () => {
    it("removes all dismissed notifications", () => {
      store.addNotification({
        type: "error",
        title: "Error 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "test-1",
      });

      store.addNotification({
        type: "error",
        title: "Error 2",
        message: "Message 2",
        source: "alertmanager",
        sourceId: "test-2",
      });

      // Dismiss first notification
      store.dismissNotification(store.notifications[0].id);

      expect(store.notifications).toHaveLength(2);

      store.clearDismissed();

      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].title).toBe("Error 2");
    });
  });

  describe("computed properties", () => {
    beforeEach(() => {
      store.addNotification({
        type: "error",
        title: "Error 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "test-1",
      });

      store.addNotification({
        type: "warning",
        title: "Warning 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "test-2",
      });

      store.addNotification({
        type: "error",
        title: "Error 2",
        message: "Message 2",
        source: "alertmanager",
        sourceId: "test-3",
      });

      // Dismiss one notification
      store.dismissNotification(store.notifications[2].id);
    });

    describe("activeNotifications", () => {
      it("returns only non-dismissed notifications", () => {
        const active = store.activeNotifications;
        expect(active).toHaveLength(2);
        expect(active[0].title).toBe("Error 1");
        expect(active[1].title).toBe("Warning 1");
      });
    });

    describe("dismissedNotifications", () => {
      it("returns only dismissed notifications (last 20)", () => {
        const dismissed = store.dismissedNotifications;
        expect(dismissed).toHaveLength(1);
        expect(dismissed[0].title).toBe("Error 2");
        expect(dismissed[0].dismissed).toBe(true);
      });

      it("limits to last 20 dismissed notifications", () => {
        // Add and dismiss 25 notifications
        for (let i = 0; i < 25; i++) {
          store.addNotification({
            type: "error",
            title: `Extra Error ${i}`,
            message: `Message ${i}`,
            source: "alertmanager",
            sourceId: `extra-${i}`,
          });
          store.dismissNotification(
            store.notifications[store.notifications.length - 1].id,
          );
        }

        const dismissed = store.dismissedNotifications;
        expect(dismissed).toHaveLength(20);
      });
    });

    describe("warningCount", () => {
      it("returns count of active warning notifications", () => {
        expect(store.warningCount).toBe(1);
      });
    });

    describe("errorCount", () => {
      it("returns count of active error notifications", () => {
        expect(store.errorCount).toBe(1);
      });
    });

    describe("totalActiveCount", () => {
      it("returns total count of active notifications", () => {
        expect(store.totalActiveCount).toBe(2);
      });
    });
  });

  describe("edge cases and error conditions", () => {
    it("handles dismissing all notifications of non-existent source", () => {
      store.addNotification({
        type: "error",
        title: "Test Error",
        message: "Test message",
        source: "alertmanager",
        sourceId: "test-1",
      });

      store.dismissAllBySource("non-existent-source");

      // Should not affect existing notifications
      expect(store.notifications[0].dismissed).toBe(false);
    });

    it("handles dismissing notifications by source with empty sourceId", () => {
      store.addNotification({
        type: "error",
        title: "Test Error",
        message: "Test message",
        source: "alertmanager",
        sourceId: "",
      });

      store.dismissAllBySource("alertmanager", "");

      expect(store.notifications[0].dismissed).toBe(true);
    });

    it("handles multiple notifications with same content but different timestamps", () => {
      const baseNotification = {
        type: "error" as const,
        title: "Same Error",
        message: "Same message",
        source: "alertmanager" as const,
        sourceId: "same-id",
      };

      store.addNotification(baseNotification);

      // Add same notification again immediately (should update existing)
      store.addNotification(baseNotification);

      // Should still have only one notification (updated)
      expect(store.notifications).toHaveLength(1);
    });

    it("handles clearing dismissed notifications when none exist", () => {
      store.addNotification({
        type: "error",
        title: "Active Error",
        message: "Message",
        source: "alertmanager",
        sourceId: "active-1",
      });

      // Clear dismissed when there are none
      store.clearDismissed();

      expect(store.notifications).toHaveLength(1);
      expect(store.activeNotifications).toHaveLength(1);
    });

    it("handles edge case of exactly 50 notifications", () => {
      // Add exactly 50 notifications
      for (let i = 0; i < 50; i++) {
        store.addNotification({
          type: "error",
          title: `Error ${i}`,
          message: `Message ${i}`,
          source: "alertmanager",
          sourceId: `test-${i}`,
        });
      }

      expect(store.notifications).toHaveLength(50);

      // Add one more - should still be 50 total
      store.addNotification({
        type: "error",
        title: "Error 50",
        message: "Message 50",
        source: "alertmanager",
        sourceId: "test-50",
      });

      expect(store.notifications).toHaveLength(50);
      expect(store.notifications[0].title).toBe("Error 1"); // First was dropped
      expect(store.notifications[49].title).toBe("Error 50"); // Latest added
    });

    it("handles notifications with empty values gracefully", () => {
      // Test that the store doesn't break with unusual inputs
      store.addNotification({
        type: "error",
        title: "",
        message: "",
        source: "alertmanager",
        sourceId: "",
      });

      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].title).toBe("");
      expect(store.notifications[0].message).toBe("");
      expect(store.notifications[0].source).toBe("alertmanager");
      expect(store.notifications[0].sourceId).toBe("");
    });

    it("maintains proper counts after complex operations", () => {
      const store = new NotificationStore();

      // Add multiple notifications with different combinations
      store.addNotification({
        type: "error",
        title: "Error 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "error-1",
      });

      store.addNotification({
        type: "warning",
        title: "Warning 1",
        message: "Message 1",
        source: "alertmanager",
        sourceId: "warning-1",
      });

      store.addNotification({
        type: "error",
        title: "Error 2",
        message: "Message 2",
        source: "system",
      });

      expect(store.activeNotifications).toHaveLength(3);
      expect(store.errorCount).toBe(2);
      expect(store.warningCount).toBe(1);

      // Dismiss some notifications
      const firstNotificationId = store.activeNotifications[0].id;
      store.dismissNotification(firstNotificationId);

      expect(store.activeNotifications).toHaveLength(2);
      expect(store.dismissedNotifications).toHaveLength(1);
      expect(store.errorCount).toBe(1);
      expect(store.warningCount).toBe(1);
    });
  });

  describe("occurrence count functionality", () => {
    it("sets occurrence count to 1 for new notifications", () => {
      const store = new NotificationStore();

      store.addNotification({
        type: "error",
        title: "New Error",
        message: "This is a new error",
        source: "alertmanager",
        sourceId: "new-error",
      });

      expect(store.activeNotifications[0].occurrenceCount).toBe(1);
    });

    it("increments occurrence count when adding same notification to active", () => {
      const store = new NotificationStore();

      // Add initial notification
      store.addNotification({
        type: "error",
        title: "Repeated Error",
        message: "This error keeps happening",
        source: "alertmanager",
        sourceId: "repeated-error",
      });

      expect(store.activeNotifications[0].occurrenceCount).toBe(1);

      // Add same notification again
      store.addNotification({
        type: "error",
        title: "Repeated Error",
        message: "This error keeps happening",
        source: "alertmanager",
        sourceId: "repeated-error",
      });

      expect(store.activeNotifications).toHaveLength(1);
      expect(store.activeNotifications[0].occurrenceCount).toBe(2);
    });

    it("increments occurrence count on dismissed notification instead of creating new", () => {
      const store = new NotificationStore();

      // Add and dismiss a notification
      store.addNotification({
        type: "warning",
        title: "Dismissed Warning",
        message: "This warning was dismissed",
        source: "alertmanager",
        sourceId: "dismissed-warning",
      });

      const notificationId = store.activeNotifications[0].id;
      const originalTimestamp = store.activeNotifications[0].timestamp;
      store.dismissNotification(notificationId);

      expect(store.activeNotifications).toHaveLength(0);
      expect(store.dismissedNotifications).toHaveLength(1);
      expect(store.dismissedNotifications[0].occurrenceCount).toBe(1);

      // Add same notification again - should increment dismissed notification count
      store.addNotification({
        type: "warning",
        title: "Dismissed Warning",
        message: "This warning was dismissed",
        source: "alertmanager",
        sourceId: "dismissed-warning",
      });

      // Still no active notifications (it stays dismissed)
      expect(store.activeNotifications).toHaveLength(0);
      expect(store.dismissedNotifications).toHaveLength(1);

      // Occurrence count should be incremented
      expect(store.dismissedNotifications[0].occurrenceCount).toBe(2);

      // Timestamp should be updated
      expect(
        store.dismissedNotifications[0].timestamp.getTime(),
      ).toBeGreaterThanOrEqual(originalTimestamp.getTime());
    });

    it("handles occurrence count correctly with different sourceIds", () => {
      const store = new NotificationStore();

      // Add notifications with same source but different sourceIds
      store.addNotification({
        type: "error",
        title: "Error A",
        message: "Error from source A",
        source: "alertmanager",
        sourceId: "source-a",
      });

      store.addNotification({
        type: "error",
        title: "Error B",
        message: "Error from source B",
        source: "alertmanager",
        sourceId: "source-b",
      });

      expect(store.activeNotifications).toHaveLength(2);
      expect(store.activeNotifications[0].occurrenceCount).toBe(1);
      expect(store.activeNotifications[1].occurrenceCount).toBe(1);

      // Add duplicate of first notification
      store.addNotification({
        type: "error",
        title: "Error A",
        message: "Error from source A",
        source: "alertmanager",
        sourceId: "source-a",
      });

      expect(store.activeNotifications).toHaveLength(2);

      // Find the notification with sourceId "source-a"
      const sourceANotification = store.activeNotifications.find(
        (n) => n.sourceId === "source-a",
      );
      const sourceBNotification = store.activeNotifications.find(
        (n) => n.sourceId === "source-b",
      );

      expect(sourceANotification?.occurrenceCount).toBe(2);
      expect(sourceBNotification?.occurrenceCount).toBe(1);
    });
  });
});

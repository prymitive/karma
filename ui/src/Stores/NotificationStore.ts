import { action, computed, observable, makeObservable } from "mobx";

export interface NotificationT {
  id: string;
  type: "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  autoDismissed: boolean;
  source: "alertmanager" | "system";
  sourceId?: string; // For alertmanager notifications, this would be the upstream name
  occurrenceCount: number; // Track how many times this notification has occurred
}

class NotificationStore {
  notifications: NotificationT[] = [];

  constructor() {
    makeObservable(this, {
      notifications: observable,
      addNotification: action,
      dismissNotification: action,
      dismissAllBySource: action,
      clearDismissed: action,
      activeNotifications: computed,
      dismissedNotifications: computed,
      warningCount: computed,
      errorCount: computed,
      totalActiveCount: computed,
    });
  }

  addNotification = (
    notification: Omit<
      NotificationT,
      "id" | "timestamp" | "dismissed" | "autoDismissed" | "occurrenceCount"
    >,
  ) => {
    // Check if we already have an active notification for this source
    const existingActiveIndex = this.notifications.findIndex(
      (n) =>
        n.sourceId === notification.sourceId &&
        n.source === notification.source &&
        !n.dismissed,
    );

    // Check if we have a previously dismissed notification for this source
    const existingDismissedIndex = this.notifications.findIndex(
      (n) =>
        n.sourceId === notification.sourceId &&
        n.source === notification.source &&
        n.dismissed,
    );

    if (existingActiveIndex >= 0) {
      // Update existing active notification
      const newNotification: NotificationT = {
        ...notification,
        id: this.notifications[existingActiveIndex].id,
        timestamp: new Date(),
        dismissed: false,
        autoDismissed: false,
        occurrenceCount:
          this.notifications[existingActiveIndex].occurrenceCount + 1,
      };
      this.notifications[existingActiveIndex] = newNotification;
    } else if (existingDismissedIndex >= 0) {
      // Instead of creating a new notification, increment the count on the dismissed one
      const dismissedNotification = this.notifications[existingDismissedIndex];
      dismissedNotification.occurrenceCount += 1;
      dismissedNotification.timestamp = new Date(); // Update timestamp to reflect latest occurrence
      // Note: We keep it dismissed but show the updated count in history
    } else {
      // Add new notification
      const newNotification: NotificationT = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        dismissed: false,
        autoDismissed: false,
        occurrenceCount: 1,
      };
      this.notifications.push(newNotification);
    }

    // Keep only last 50 notifications to prevent memory issues
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(-50);
    }
  };

  dismissNotification = (id: string, isAutoDismiss = false) => {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.dismissed = true;
      notification.autoDismissed = isAutoDismiss;
    }
  };

  dismissAllBySource = (
    source: string,
    sourceId?: string,
    isAutoDismiss = false,
  ) => {
    this.notifications.forEach((notification) => {
      if (
        notification.source === source &&
        (!sourceId || notification.sourceId === sourceId) &&
        !notification.dismissed
      ) {
        notification.dismissed = true;
        notification.autoDismissed = isAutoDismiss;
      }
    });
  };

  clearDismissed = () => {
    this.notifications = this.notifications.filter((n) => !n.dismissed);
  };

  get activeNotifications(): NotificationT[] {
    return this.notifications.filter((n) => !n.dismissed);
  }

  get dismissedNotifications(): NotificationT[] {
    return this.notifications.filter((n) => n.dismissed).slice(-20); // Keep last 20 dismissed
  }

  get warningCount(): number {
    return this.activeNotifications.filter((n) => n.type === "warning").length;
  }

  get errorCount(): number {
    return this.activeNotifications.filter((n) => n.type === "error").length;
  }

  get totalActiveCount(): number {
    return this.activeNotifications.length;
  }
}

export { NotificationStore };
export const notificationStore = new NotificationStore();

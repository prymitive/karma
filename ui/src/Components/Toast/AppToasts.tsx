import { FC, Fragment, useCallback } from "react";

import { observer } from "mobx-react-lite";

import { faArrowUp } from "@fortawesome/free-solid-svg-icons/faArrowUp";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";

import type { AlertStore } from "Stores/AlertStore";
import { notificationStore } from "Stores/NotificationStore";
import { ToastContainer, Toast } from ".";
import { ToastMessage, UpgradeToastMessage } from "./ToastMessages";

const AppToasts: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
  const handleDismissNotification = useCallback((id: string) => {
    notificationStore.dismissNotification(id, false);
  }, []);

  if (alertStore.info.upgradeNeeded) {
    return null;
  }

  const activeNotifications = notificationStore.activeNotifications;

  if (
    activeNotifications.length === 0 &&
    alertStore.info.upgradeReady === false
  ) {
    return null;
  }

  return (
    <Fragment>
      <ToastContainer>
        {activeNotifications.map((notification) => (
          <Toast
            key={notification.id}
            icon={
              notification.type === "error"
                ? faExclamationCircle
                : faExclamationTriangle
            }
            iconClass={
              notification.type === "error" ? "text-danger" : "text-warning"
            }
            message={
              <ToastMessage
                title={notification.title}
                message={notification.message}
                timestamp={notification.timestamp}
                occurrenceCount={notification.occurrenceCount}
              />
            }
            hasClose
            onClose={() => handleDismissNotification(notification.id)}
          />
        ))}
        {alertStore.info.upgradeReady ? (
          <Toast
            key="upgrade"
            icon={faArrowUp}
            iconClass="text-success"
            message={<UpgradeToastMessage alertStore={alertStore} />}
            hasClose={false}
          />
        ) : null}
      </ToastContainer>
    </Fragment>
  );
};

export default observer(AppToasts);

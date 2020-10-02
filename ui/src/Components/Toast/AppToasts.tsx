import React, { FC } from "react";

import { observer } from "mobx-react-lite";

import { faArrowUp } from "@fortawesome/free-solid-svg-icons/faArrowUp";
import { faExclamation } from "@fortawesome/free-solid-svg-icons/faExclamation";

import { AlertStore } from "Stores/AlertStore";
import { ToastContainer, Toast } from ".";
import { ToastMessage, UpgradeToastMessage } from "./ToastMessages";

const AppToasts: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
  return alertStore.info.upgradeNeeded ? null : (
    <ToastContainer>
      {alertStore.data.upstreams.instances
        .filter((upstream) => upstream.error !== "")
        .map((upstream) => (
          <Toast
            key={upstream.name}
            icon={faExclamation}
            iconClass="text-danger"
            message={
              <ToastMessage
                title={`Alertmanager ${upstream.name} raised an error`}
                message={upstream.error}
              />
            }
          />
        ))}
      {alertStore.info.upgradeReady ? (
        <Toast
          key="upgrade"
          icon={faArrowUp}
          iconClass="text-success"
          message={<UpgradeToastMessage alertStore={alertStore} />}
        />
      ) : null}
    </ToastContainer>
  );
};

export default observer(AppToasts);

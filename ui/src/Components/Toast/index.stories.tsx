import { storiesOf } from "@storybook/react";

import { faArrowUp } from "@fortawesome/free-solid-svg-icons/faArrowUp";
import { faExclamation } from "@fortawesome/free-solid-svg-icons/faExclamation";

import { AlertStore } from "../../Stores/AlertStore";
import { Toast } from ".";
import { ToastMessage, UpgradeToastMessage } from "./ToastMessages";

import "Styles/Percy.scss";

storiesOf("AppToasts", module).add("AppToasts", () => {
  const alertStore = new AlertStore([]);
  alertStore.info.setVersion("999.99.0");

  return (
    <div className="d-flex flex-column">
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message={
          <ToastMessage
            title={`Alertmanager am1 raised an error`}
            message="connection refused"
          />
        }
        hasClose
      />
      <Toast
        key="upgrade"
        icon={faArrowUp}
        iconClass="text-success"
        message={<UpgradeToastMessage alertStore={alertStore} />}
        hasClose={false}
      />
    </div>
  );
});

import { FC, ReactNode, useState, useCallback } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStop } from "@fortawesome/free-solid-svg-icons/faStop";
import { faSync } from "@fortawesome/free-solid-svg-icons/faSync";

import { AlertStore } from "Stores/AlertStore";

const ToastMessage: FC<{
  title: ReactNode;
  message: ReactNode;
}> = ({ title, message }) => {
  return (
    <div>
      <div>{title}</div>
      <div>
        <code>{message}</code>
      </div>
    </div>
  );
};

const UpgradeToastMessage: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const setPause = useCallback(() => {
    if (isPaused) {
      alertStore.info.setUpgradeNeeded(true);
    } else {
      setIsPaused(true);
    }
  }, [alertStore.info, isPaused]);

  return (
    <div>
      <div>
        New version available, updates are paused until this page auto reloads
      </div>
      <div>
        <code>{alertStore.info.version}</code>
      </div>
      <div className="d-flex flex-row-reverse">
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={setPause}
        >
          <FontAwesomeIcon icon={isPaused ? faSync : faStop} className="me-2" />
          {isPaused ? "Reload now" : "Stop auto-reload"}
        </button>
      </div>
      <div className="mt-2 progress bg-dark" style={{ height: 2 }}>
        <div
          className={`progress-bar bg-white ${
            isPaused ? "" : "toast-upgrade-progressbar"
          }`}
          onAnimationEnd={() => alertStore.info.setUpgradeNeeded(true)}
          role="progressbar"
          style={{ width: 100 }}
        ></div>
      </div>
    </div>
  );
};

export { ToastMessage, UpgradeToastMessage };

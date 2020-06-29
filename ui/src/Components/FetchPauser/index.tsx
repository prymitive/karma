import { FC, ReactElement, useEffect } from "react";

import { AlertStore } from "Stores/AlertStore";

const FetchPauser: FC<{
  children: ReactElement;
  alertStore: AlertStore;
}> = ({ children, alertStore }) => {
  useEffect(() => {
    alertStore.status.pause();
    return alertStore.status.resume;
  }, [alertStore.status]);

  return children;
};

export { FetchPauser };

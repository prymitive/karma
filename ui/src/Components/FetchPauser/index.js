import { useEffect } from "react";
import PropTypes from "prop-types";

import { AlertStore } from "Stores/AlertStore";

const FetchPauser = ({ children, alertStore }) => {
  useEffect(() => {
    alertStore.status.pause();
    return alertStore.status.resume;
  }, [alertStore.status]);

  return children;
};
FetchPauser.propTypes = {
  children: PropTypes.any,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { FetchPauser };

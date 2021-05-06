import { FC, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { CenteredMessage } from "Components/CenteredMessage";

const ReloadNeeded: FC<{
  reloadAfter: number;
}> = ({ reloadAfter }) => {
  useEffect(() => {
    const timer = setTimeout(() => window.location.reload(), reloadAfter);
    return () => clearTimeout(timer);
  }, [reloadAfter]);

  return (
    <CenteredMessage>
      <div className="container-fluid text-center">
        <FontAwesomeIcon
          icon={faExclamationCircle}
          className="screen-center-icon-big text-danger mb-4"
        />
        <p className="lead text-white bg-secondary p-3 rounded text-wrap text-break">
          <FontAwesomeIcon className="me-2" icon={faSpinner} spin />
          All API connection attempts failed. This migth be caused by
          authentication middleware, will try to reload.
        </p>
      </div>
    </CenteredMessage>
  );
};

export { ReloadNeeded };

import { FC, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket } from "@fortawesome/free-solid-svg-icons/faRocket";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { CenteredMessage } from "Components/CenteredMessage";

import "csshake/dist/csshake-slow.css";

const UpgradeNeeded: FC<{
  newVersion: string;
  reloadAfter: number;
}> = ({ newVersion, reloadAfter }) => {
  useEffect(() => {
    const timer = setTimeout(() => window.location.reload(), reloadAfter);
    return () => clearTimeout(timer);
  }, [reloadAfter]);

  return (
    <CenteredMessage>
      <div className="container-fluid text-center">
        <div className="shake-slow shake-constant mb-4">
          <FontAwesomeIcon
            icon={faRocket}
            className="screen-center-icon-big text-success"
          />
        </div>
        <p className="lead text-muted">
          <FontAwesomeIcon className="me-2" icon={faSpinner} spin />
          Upgrading to a new version: {newVersion}
        </p>
      </div>
    </CenteredMessage>
  );
};

export { UpgradeNeeded };

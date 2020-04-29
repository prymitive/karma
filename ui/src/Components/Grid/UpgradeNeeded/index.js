import React, { useEffect } from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket } from "@fortawesome/free-solid-svg-icons/faRocket";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

import { CenteredMessage } from "Components/CenteredMessage";

import "csshake/scss/csshake-slow.scss";

const UpgradeNeeded = ({ newVersion, reloadAfter }) => {
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
          <FontAwesomeIcon className="mr-2" icon={faSpinner} spin />
          Upgrading to a new version: {newVersion}
        </p>
      </div>
    </CenteredMessage>
  );
};
UpgradeNeeded.propTypes = {
  newVersion: PropTypes.string.isRequired,
  reloadAfter: PropTypes.number.isRequired,
};

export { UpgradeNeeded };

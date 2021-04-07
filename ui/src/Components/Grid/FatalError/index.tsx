import { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

import { CenteredMessage } from "Components/CenteredMessage";

const FatalError: FC<{ message: string }> = ({ message }) => (
  <CenteredMessage>
    <div className="container-fluid text-center">
      <FontAwesomeIcon
        icon={faExclamationCircle}
        className="screen-center-icon-big text-danger mb-4"
      />
      <p className="lead text-white bg-secondary p-3 rounded text-wrap text-break">
        {message}
      </p>
    </div>
  </CenteredMessage>
);

export { FatalError };

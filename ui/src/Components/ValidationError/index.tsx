import { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";

const ValidationError: FC = () => (
  <span className="text-danger">
    <FontAwesomeIcon icon={faExclamationCircle} /> Required
  </span>
);

export { ValidationError };

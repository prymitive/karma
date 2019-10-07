import React from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";

import "./index.scss";

const EmptyGrid = () => (
  <h1 className="display-1 text-secondary screen-center">
    <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: "14rem" }} />
  </h1>
);

export { EmptyGrid };

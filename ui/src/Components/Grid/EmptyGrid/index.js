import React from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMugHot } from "@fortawesome/free-solid-svg-icons/faMugHot";

import "./index.scss";

const EmptyGrid = () => (
  <h1 className="display-1 text-secondary screen-center">
    <FontAwesomeIcon icon={faMugHot} style={{ fontSize: "14rem" }} />
  </h1>
);

export { EmptyGrid };

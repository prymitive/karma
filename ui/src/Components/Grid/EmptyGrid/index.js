import React from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMugHot } from "@fortawesome/free-solid-svg-icons/faMugHot";

import { MountFade } from "Components/Animations/MountFade";

import "./index.scss";

const EmptyGrid = () => (
  <h1 className="display-1 text-placeholder screen-center">
    <MountFade in={true}>
      <FontAwesomeIcon icon={faMugHot} style={{ fontSize: "14rem" }} />
    </MountFade>
  </h1>
);

export { EmptyGrid };

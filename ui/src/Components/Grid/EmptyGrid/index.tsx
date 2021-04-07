import { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMugHot } from "@fortawesome/free-solid-svg-icons/faMugHot";

import { CenteredMessage } from "Components/CenteredMessage";

const EmptyGrid: FC = () => (
  <CenteredMessage>
    <FontAwesomeIcon
      icon={faMugHot}
      className="screen-center-icon-big text-placeholder"
    />
  </CenteredMessage>
);

export { EmptyGrid };

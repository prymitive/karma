import { FC } from "react";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const MenuLink: FC<{
  icon: IconDefinition;
  text: string;
  uri: string;
  afterClick: () => void;
}> = ({ icon, text, uri, afterClick }) => {
  return (
    <a
      className="dropdown-item"
      href={uri}
      target="_blank"
      rel="noopener noreferrer"
      onClick={afterClick}
    >
      <FontAwesomeIcon className="me-1" icon={icon} />
      {text}
    </a>
  );
};

export { MenuLink };

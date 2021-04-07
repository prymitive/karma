import { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

const ToggleIcon: FC<{
  isOpen: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ className, isOpen, onClick }) => {
  return (
    <FontAwesomeIcon
      icon={faChevronDown}
      rotation={isOpen ? undefined : 180}
      className={className}
      style={{ transition: "transform 0.25s ease-in-out" }}
      onClick={onClick}
    />
  );
};

export { ToggleIcon };

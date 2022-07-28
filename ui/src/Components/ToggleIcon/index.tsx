import type { FC } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";

const ToggleIcon: FC<{
  isOpen: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ className, isOpen, onClick }) => {
  return (
    <FontAwesomeIcon
      icon={faChevronUp}
      rotation={isOpen ? undefined : 180}
      className={className}
      style={{ transition: "transform 0.25s ease-in-out" }}
      onClick={onClick}
    />
  );
};

export { ToggleIcon };

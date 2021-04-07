import { FC, MouseEvent } from "react";

const Tab: FC<{
  title: string;
  active?: boolean;
  onClick: (event: MouseEvent<HTMLElement>) => void;
}> = ({ title, active, onClick }) => (
  <span
    className={`nav-item nav-link cursor-pointer mx-1 px-2 ${
      active ? "active" : "components-tab-inactive"
    }`}
    onClick={onClick}
  >
    {title}
  </span>
);

export { Tab };

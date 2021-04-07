import { FC } from "react";

import { observer } from "mobx-react-lite";

import { AlertStore } from "Stores/AlertStore";
import { GetClassAndStyle } from "Components/Labels/Utils";

// Renders a static label element, no click actions, no hover
const StaticLabel: FC<{
  alertStore: AlertStore;
  name: string;
  value: string;
}> = ({ alertStore, name, value }) => {
  const cs = GetClassAndStyle(alertStore, name, value);

  return (
    <span className={cs.className} style={cs.style}>
      <span className="components-label-name">{name}:</span>{" "}
      <span className="components-label-value">{value}</span>
    </span>
  );
};

export default observer(StaticLabel);

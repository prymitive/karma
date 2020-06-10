import React from "react";

import { useObserver } from "mobx-react-lite";

import { GetClassAndStyle } from "Components/Labels/Utils";

// Renders a static label element, no click actions, no hover
const StaticLabel = ({ alertStore, name, value }) => {
  const cs = GetClassAndStyle(alertStore, name, value);

  return useObserver(() => (
    <span className={cs.className} style={cs.style}>
      <span className="components-label-name">{name}:</span>{" "}
      <span className="components-label-value">{value}</span>
    </span>
  ));
};

export { StaticLabel };

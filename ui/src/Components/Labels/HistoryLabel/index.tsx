import React, { FC } from "react";

import { useObserver } from "mobx-react-lite";

import { QueryOperators } from "Common/Query";
import { AlertStore } from "Stores/AlertStore";
import { GetClassAndStyle } from "Components/Labels/Utils";

const HistoryLabel: FC<{
  alertStore: AlertStore;
  name: string;
  matcher: string;
  value: string;
}> = ({ alertStore, name, matcher, value }) => {
  const cs = GetClassAndStyle(
    alertStore,
    matcher === QueryOperators.Equal ? name : "",
    matcher === QueryOperators.Equal ? value : "",
    "components-label-history components-label-value"
  );

  return useObserver(() => (
    <span className={cs.className} style={cs.style}>
      {name ? `${name}${matcher}` : null}
      {value}
    </span>
  ));
};

export { HistoryLabel };

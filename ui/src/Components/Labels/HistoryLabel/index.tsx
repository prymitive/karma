import type { FC } from "react";

import { observer } from "mobx-react-lite";

import { QueryOperators } from "Common/Query";
import type { AlertStore } from "Stores/AlertStore";
import { GetClassAndStyle } from "Components/Labels/Utils";

const HistoryLabel: FC<{
  alertStore: AlertStore;
  raw: string;
  name: string;
  matcher: string;
  value: string;
}> = ({ alertStore, raw, name, matcher, value }) => {
  const cs = GetClassAndStyle(
    alertStore,
    matcher === QueryOperators.Equal ? name : "",
    matcher === QueryOperators.Equal ? value : "",
    "components-label-history components-label-value",
  );

  return (
    <span className={cs.className} style={cs.style}>
      {raw}
    </span>
  );
};

export default observer(HistoryLabel);

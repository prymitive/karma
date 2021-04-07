import { FC, useCallback, MouseEvent } from "react";

import { observer } from "mobx-react-lite";

import { AlertStore } from "Stores/AlertStore";
import { QueryOperators, FormatQuery } from "Common/Query";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { GetClassAndStyle } from "Components/Labels/Utils";

const FilteringLabel: FC<{
  alertStore: AlertStore;
  name: string;
  value: string;
}> = ({ alertStore, name, value }) => {
  const handleClick = useCallback(
    (event: MouseEvent) => {
      // left click       => apply foo=bar filter
      // left click + alt => apply foo!=bar filter
      const operator =
        event.altKey === true ? QueryOperators.NotEqual : QueryOperators.Equal;

      event.preventDefault();

      alertStore.filters.addFilter(FormatQuery(name, operator, value));
    },
    [alertStore.filters, name, value]
  );

  const cs = GetClassAndStyle(
    alertStore,
    name,
    value,
    "components-label-with-hover"
  );

  return (
    <TooltipWrapper title="Click to only show alerts with this label or Alt+Click to hide them">
      <span className={cs.className} style={cs.style} onClick={handleClick}>
        <span className="components-label-name">{name}:</span>{" "}
        <span className="components-label-value">{value}</span>
      </span>
    </TooltipWrapper>
  );
};

export default observer(FilteringLabel);

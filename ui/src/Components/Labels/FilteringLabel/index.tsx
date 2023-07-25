import { FC, useCallback, MouseEvent } from "react";

import { observer } from "mobx-react-lite";

import copy from "copy-to-clipboard";

import type { AlertStore } from "Stores/AlertStore";
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
      // left click         => apply foo=bar filter
      // left click + alt   => apply foo!=bar filter
      // left click + shift => copy label value

      event.preventDefault();

      if (event.shiftKey) {
        copy(value);
        return;
      }

      let operators = [QueryOperators.Equal, QueryOperators.NotEqual];
      if (event.altKey) {
        operators = operators.reverse();
      }

      alertStore.filters.replaceFilter(
        FormatQuery(name, operators[1], value),
        FormatQuery(name, operators[0], value),
      );
    },
    [alertStore.filters, name, value],
  );

  const cs = GetClassAndStyle(
    alertStore,
    name,
    value,
    "components-label-with-hover components-label-without-select",
  );

  return (
    <TooltipWrapper title="Click to only show alerts with this label or Alt+Click to hide them. You can copy the value of this label with Shift+Click.">
      <span className={cs.className} style={cs.style} onClick={handleClick}>
        {alertStore.settings.values.labels[name]?.isValueOnly ? null : (
          <>
            <span className="components-label-name">{name}:</span>{" "}
          </>
        )}
        <span className="components-label-value">{value}</span>
      </span>
    </TooltipWrapper>
  );
};

export default observer(FilteringLabel);

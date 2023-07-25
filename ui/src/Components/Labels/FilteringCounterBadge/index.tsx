import { FC, useCallback, MouseEvent } from "react";

import { observer } from "mobx-react-lite";

import { CSSTransition } from "react-transition-group";

import type { AlertStore } from "Stores/AlertStore";
import { QueryOperators, FormatQuery } from "Common/Query";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { GetClassAndStyle } from "Components/Labels/Utils";
import { useFlashTransition } from "Hooks/useFlashTransition";

// Same as FilteringLabel but for labels that are counters (usually @state)
// and only renders a pill badge with the counter, it doesn't render anything
// if the counter is 0
const FilteringCounterBadge: FC<{
  alertStore: AlertStore;
  name: string;
  value: string;
  counter: number;
  themed: boolean;
  alwaysVisible?: boolean;
  defaultColor?: "bg-light" | "bg-primary";
  isAppend?: boolean;
}> = ({
  alertStore,
  name,
  value,
  counter,
  themed,
  alwaysVisible = false,
  defaultColor = "bg-light",
  isAppend = true,
}) => {
  const { ref, props } = useFlashTransition(counter);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      // left click       => apply foo=bar filter
      // left click + alt => apply foo!=bar filter
      let operators = [QueryOperators.Equal, QueryOperators.NotEqual];
      if (event.altKey) {
        operators = operators.reverse();
      }

      event.preventDefault();

      if (isAppend) {
        alertStore.filters.replaceFilter(
          FormatQuery(name, operators[1], value),
          FormatQuery(name, operators[0], value),
        );
      } else {
        alertStore.filters.setFilters([FormatQuery(name, operators[0], value)]);
      }
    },
    [alertStore.filters, name, value, isAppend],
  );

  if (!alwaysVisible && counter === 0) return null;

  const cs = GetClassAndStyle(
    alertStore,
    name,
    value,
    "rounded-pill components-label-with-hover",
  );

  return (
    <TooltipWrapper
      title={`Click to only show ${name}=${value} alerts or Alt+Click to hide them`}
    >
      <CSSTransition {...props}>
        <span
          ref={ref}
          className={
            themed
              ? cs.className
              : [
                  `${defaultColor}`,
                  "rounded-pill components-label-with-hover",
                  ...cs.baseClassNames,
                ].join(" ")
          }
          style={themed ? {} : cs.style}
          onClick={handleClick}
        >
          {counter}
        </span>
      </CSSTransition>
    </TooltipWrapper>
  );
};

export default observer(FilteringCounterBadge);

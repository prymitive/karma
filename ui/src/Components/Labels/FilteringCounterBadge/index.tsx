import { FC, useCallback, MouseEvent } from "react";

import { observer } from "mobx-react-lite";

import { CSSTransition } from "react-transition-group";

import { AlertStore } from "Stores/AlertStore";
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
  defaultColor?: "light" | "primary";
  isAppend?: boolean;
}> = ({
  alertStore,
  name,
  value,
  counter,
  themed,
  alwaysVisible = false,
  defaultColor = "light",
  isAppend = true,
}) => {
  const { ref, props } = useFlashTransition(counter);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      // left click       => apply foo=bar filter
      // left click + alt => apply foo!=bar filter
      const operator =
        event.altKey === true ? QueryOperators.NotEqual : QueryOperators.Equal;

      event.preventDefault();

      if (isAppend) {
        alertStore.filters.addFilter(FormatQuery(name, operator, value));
      } else {
        alertStore.filters.setFilters([FormatQuery(name, operator, value)]);
      }
    },
    [alertStore.filters, name, value, isAppend]
  );

  if (!alwaysVisible && counter === 0) return null;

  const cs = GetClassAndStyle(
    alertStore,
    name,
    value,
    "rounded-pill components-label-with-hover"
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
                  `bg-${defaultColor}`,
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

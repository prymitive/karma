import React, { useCallback } from "react";
import PropTypes from "prop-types";

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
const FilteringCounterBadge = observer(
  ({
    alertStore,
    name,
    value,
    counter,
    themed,
    alwaysVisible,
    defaultColor,
  }) => {
    const { ref, props } = useFlashTransition(counter);

    const handleClick = useCallback(
      (event) => {
        // left click       => apply foo=bar filter
        // left click + alt => apply foo!=bar filter
        const operator =
          event.altKey === true
            ? QueryOperators.NotEqual
            : QueryOperators.Equal;

        event.preventDefault();

        alertStore.filters.addFilter(FormatQuery(name, operator, value));
      },
      [alertStore.filters, name, value]
    );

    if (!alwaysVisible && counter === 0) return null;

    const cs = GetClassAndStyle(
      alertStore,
      name,
      value,
      "badge-pill components-label-with-hover"
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
                    `badge-${defaultColor}`,
                    "badge-pill components-label-with-hover",
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
  }
);
FilteringCounterBadge.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  counter: PropTypes.number.isRequired,
  themed: PropTypes.bool.isRequired,
  alwaysVisible: PropTypes.bool,
  defaultColor: PropTypes.oneOf(["light", "primary"]),
};
FilteringCounterBadge.defaultProps = {
  defaultColor: "light",
};

export { FilteringCounterBadge };

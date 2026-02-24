import { forwardRef, MouseEvent } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGrip } from "@fortawesome/free-solid-svg-icons/faGrip";

import type { AlertStore } from "Stores/AlertStore";
import type { Settings } from "Stores/Settings";
import type { APIGridT } from "Models/APITypes";
import FilteringLabel from "Components/Labels/FilteringLabel";
import FilteringCounterBadge from "Components/Labels/FilteringCounterBadge";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ToggleIcon } from "Components/ToggleIcon";
import { GridLabelSelect } from "./GridLabelSelect";

interface SwimlaneProps {
  alertStore: AlertStore;
  settingsStore: Settings;
  grid: APIGridT;
  isExpanded: boolean;
  onToggle: (event: MouseEvent) => void;
  paddingTop: number;
}

const Swimlane = forwardRef<HTMLHeadingElement, SwimlaneProps>(
  (
    { alertStore, settingsStore, grid, isExpanded, onToggle, paddingTop },
    ref,
  ) => {
    return (
      <h5
        ref={ref}
        className="components-grid-swimlane d-flex flex-row justify-content-between rounded px-2 py-1 my-1 border border-dark"
        style={{ top: paddingTop }}
      >
        <span className="flex-shrink-0 flex-grow-0 d-none d-sm-block">
          <span className="badge components-label px-0 ms-1 me-3">
            <FontAwesomeIcon icon={faGrip} className="text-muted" />
          </span>
        </span>
        <span
          className="flex-shrink-1 flex-grow-0 ms-1 ms-sm-0"
          style={{ minWidth: "0px" }}
        >
          {grid.labelName !== "" && grid.labelValue !== "" && (
            <FilteringLabel
              key={grid.labelValue}
              name={grid.labelName}
              value={grid.labelValue}
              alertStore={alertStore}
            />
          )}
        </span>
        {grid.labelName !== "" && grid.labelValue !== "" && (
          <span
            className="flex-shrink-0 flex-grow-1 px-0"
            style={{ minWidth: "0px" }}
          >
            <GridLabelSelect
              alertStore={alertStore}
              settingsStore={settingsStore}
              grid={grid}
            />
          </span>
        )}
        <span className="flex-shrink-0 flex-grow-0 ms-2 me-0">
          <FilteringCounterBadge
            name="@state"
            value="unprocessed"
            counter={grid.stateCount.unprocessed}
            themed={true}
            alertStore={alertStore}
          />
          <FilteringCounterBadge
            name="@state"
            value="suppressed"
            counter={grid.stateCount.suppressed}
            themed={true}
            alertStore={alertStore}
          />
          <FilteringCounterBadge
            name="@state"
            value="active"
            counter={grid.stateCount.active}
            themed={true}
            alertStore={alertStore}
          />
          <span
            className="text-muted cursor-pointer badge with-click with-click-dark components-label ms-1 me-0"
            onClick={onToggle}
          >
            <TooltipWrapper title="Click to toggle this grid details or Alt+Click to toggle all grids">
              <ToggleIcon isOpen={isExpanded} />
            </TooltipWrapper>
          </span>
        </span>
      </h5>
    );
  },
);

export { Swimlane };

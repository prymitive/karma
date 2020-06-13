import React from "react";
import PropTypes from "prop-types";

import { Fade } from "react-reveal";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTh } from "@fortawesome/free-solid-svg-icons/faTh";

import { AlertStore } from "Stores/AlertStore";
import { APIGrid } from "Models/API";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ToggleIcon } from "Components/ToggleIcon";
import { ThemeContext } from "Components/Theme";

const Swimlane = ({ alertStore, grid, isExpanded, onToggle }) => {
  const context = React.useContext(ThemeContext);

  return (
    <Fade in={context.animations.in} duration={context.animations.duration}>
      <h5 className="components-grid-swimlane d-flex flex-row justify-content-between rounded px-2 py-1 mt-2 mb-0 border border-dark">
        <span className="flex-shrink-0 flex-grow-0">
          <span className="badge components-label px-0 ml-1 mr-3">
            <FontAwesomeIcon icon={faTh} className="text-muted" />
          </span>
        </span>
        <span className="flex-shrink-1 flex-grow-1" style={{ minWidth: "0px" }}>
          {grid.labelName !== "" && grid.labelValue !== "" && (
            <FilteringLabel
              key={grid.labelValue}
              name={grid.labelName}
              value={grid.labelValue}
              alertStore={alertStore}
            />
          )}
        </span>
        <span className="flex-shrink-0 flex-grow-0 ml-2 mr-0">
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
            className="text-muted cursor-pointer badge px-0 components-label ml-2 mr-1"
            onClick={onToggle}
          >
            <TooltipWrapper title="Click to toggle this grid details or Alt+Click to toggle all grids">
              <ToggleIcon isOpen={isExpanded} />
            </TooltipWrapper>
          </span>
        </span>
      </h5>
    </Fade>
  );
};
Swimlane.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  grid: APIGrid.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export { Swimlane };

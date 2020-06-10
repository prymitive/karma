import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { APIGroup } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { AlertAck } from "Components/AlertAck";
import { ToggleIcon } from "Components/ToggleIcon";
import { GroupMenu } from "./GroupMenu";

const GroupHeader = ({
  isCollapsed,
  setIsCollapsed,
  group,
  alertStore,
  silenceFormStore,
  themedCounters,
  setIsMenuOpen,
  gridLabelValue,
}) => {
  const onCollapseClick = (event) => {
    // left click       => toggle current group
    // left click + alt => toggle all groups
    setIsCollapsed(!isCollapsed);

    if (event.altKey === true) {
      const toggleEvent = new CustomEvent("alertGroupCollapse", {
        detail: {
          gridLabelValue: gridLabelValue,
          value: !isCollapsed,
        },
      });
      window.dispatchEvent(toggleEvent);
    }
  };

  return useObserver(() => (
    <h5
      className={`card-header mb-0 d-flex flex-row px-2 py-1 ${
        isCollapsed ? "border-bottom-0" : ""
      }`}
    >
      <span className="flex-shrink-0 flex-grow-0">
        <GroupMenu
          group={group}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          themed={!themedCounters}
          setIsMenuOpen={setIsMenuOpen}
        />
      </span>
      <span className="flex-shrink-1 flex-grow-1" style={{ minWidth: 0 }}>
        {Object.keys(group.labels).map((name) => (
          <FilteringLabel
            key={name}
            name={name}
            value={group.labels[name]}
            alertStore={alertStore}
          />
        ))}
      </span>
      <span className="flex-shrink-0 flex-grow-0 ml-auto pl-1">
        {group.stateCount.active > 0 && (
          <AlertAck
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
            group={group}
          />
        )}
        <FilteringCounterBadge
          name="@state"
          value="unprocessed"
          counter={group.stateCount.unprocessed}
          themed={themedCounters}
          alertStore={alertStore}
        />
        <FilteringCounterBadge
          name="@state"
          value="suppressed"
          counter={group.stateCount.suppressed}
          themed={themedCounters}
          alertStore={alertStore}
        />
        <FilteringCounterBadge
          name="@state"
          value="active"
          counter={group.stateCount.active}
          themed={themedCounters}
          alertStore={alertStore}
        />
        <span
          className={`${
            themedCounters ? "text-muted" : "text-white"
          } cursor-pointer badge px-0 components-label mr-0 pl-2 pl-sm-1`}
          onClick={onCollapseClick}
        >
          <TooltipWrapper title="Click to toggle this group details or Alt+Click to toggle all groups">
            <ToggleIcon isOpen={!isCollapsed} />
          </TooltipWrapper>
        </span>
      </span>
    </h5>
  ));
};
GroupHeader.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
  setIsCollapsed: PropTypes.func.isRequired,
  group: APIGroup.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  themedCounters: PropTypes.bool.isRequired,
  setIsMenuOpen: PropTypes.func.isRequired,
  gridLabelValue: PropTypes.string.isRequired,
};

export { GroupHeader };

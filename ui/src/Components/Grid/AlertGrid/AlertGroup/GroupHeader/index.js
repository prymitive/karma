import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

import { APIGroup } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { GroupMenu } from "./GroupMenu";

const GroupHeader = observer(
  class GroupHeader extends Component {
    static propTypes = {
      collapseStore: PropTypes.shape({
        value: PropTypes.bool.isRequired,
        toggle: PropTypes.func.isRequired
      }).isRequired,
      group: APIGroup.isRequired,
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      themedCounters: PropTypes.bool.isRequired
    };

    render() {
      const {
        collapseStore,
        group,
        alertStore,
        silenceFormStore,
        themedCounters
      } = this.props;

      return (
        <h5
          className={`card-header mb-0 d-flex flex-row px-2 py-1 ${
            collapseStore.value ? "border-bottom-0" : ""
          }`}
        >
          <span className="flex-shrink-0 flex-grow-0">
            <GroupMenu
              group={group}
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
              themed={!themedCounters}
            />
          </span>
          <span className="flex-shrink-1 flex-grow-1" style={{ minWidth: 0 }}>
            {Object.keys(group.labels).map(name => (
              <FilteringLabel
                key={name}
                name={name}
                value={group.labels[name]}
              />
            ))}
          </span>
          <span className="flex-shrink-0 flex-grow-0 ml-auto pl-1">
            <FilteringCounterBadge
              name="@state"
              value="unprocessed"
              counter={group.stateCount.unprocessed}
              themed={themedCounters}
            />
            <FilteringCounterBadge
              name="@state"
              value="suppressed"
              counter={group.stateCount.suppressed}
              themed={themedCounters}
            />
            <FilteringCounterBadge
              name="@state"
              value="active"
              counter={group.stateCount.active}
              themed={themedCounters}
            />
            <span
              className={`${
                themedCounters ? "text-muted" : "text-white"
              } cursor-pointer badge text-nowrap text-truncate px-0`}
              onClick={collapseStore.toggle}
            >
              <FontAwesomeIcon
                icon={collapseStore.value ? faChevronUp : faChevronDown}
                data-tip="Toggle group details"
              />
            </span>
          </span>
        </h5>
      );
    }
  }
);

export { GroupHeader };

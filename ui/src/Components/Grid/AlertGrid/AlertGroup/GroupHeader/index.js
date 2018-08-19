import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { GroupMenu } from "./GroupMenu";

const GroupHeader = observer(
  class GroupHeader extends Component {
    static propTypes = {
      collapseStore: PropTypes.object.isRequired,
      group: PropTypes.object.isRequired,
      silenceFormStore: PropTypes.object.isRequired
    };

    render() {
      const { collapseStore, group, silenceFormStore } = this.props;

      return (
        <h5 className="card-title text-center mb-0 clearfix">
          <span className="float-left">
            <GroupMenu group={group} silenceFormStore={silenceFormStore} />
          </span>
          <span className="float-right">
            <FilteringCounterBadge
              name="@state"
              value="unprocessed"
              counter={group.stateCount.unprocessed}
            />
            <FilteringCounterBadge
              name="@state"
              value="suppressed"
              counter={group.stateCount.suppressed}
            />
            <FilteringCounterBadge
              name="@state"
              value="active"
              counter={group.stateCount.active}
            />
            <a
              className="text-muted cursor-pointer badge text-nowrap text-truncate pr-0"
              onClick={collapseStore.toggle}
              data-tooltip="Collapse/expand group details"
            >
              <FontAwesomeIcon
                icon={collapseStore.value ? faChevronUp : faChevronDown}
              />
            </a>
          </span>
          <span>
            {Object.keys(group.labels).map(name => (
              <FilteringLabel
                key={name}
                name={name}
                value={group.labels[name]}
              />
            ))}
          </span>
        </h5>
      );
    }
  }
);

export { GroupHeader };

import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShareSquare } from "@fortawesome/free-solid-svg-icons/faShareSquare";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

import { FormatAPIFilterQuery } from "Stores/AlertStore";
import { QueryOperators, StaticLabels, FormatQuery } from "Common/Query";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";

const GroupHeader = observer(
  class GroupHeader extends Component {
    static propTypes = {
      collapseStore: PropTypes.object.isRequired,
      labels: PropTypes.object.isRequired,
      receiver: PropTypes.string.isRequired,
      stateCount: PropTypes.object.isRequired
    };

    render() {
      const { collapseStore, labels, receiver, stateCount } = this.props;

      let groupFilters = Object.keys(labels).map(name =>
        FormatQuery(name, QueryOperators.Equal, labels[name])
      );
      groupFilters.push(
        FormatQuery(StaticLabels.Receiver, QueryOperators.Equal, receiver)
      );
      const groupLink = `?${FormatAPIFilterQuery(groupFilters)}`;

      return (
        <h5 className="card-title text-center mb-0">
          <a
            href={groupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="float-left badge badge-pill text-nowrap text-truncate mr-1 ml-0 pl-0 pr-1"
          >
            <FontAwesomeIcon icon={faShareSquare} />
          </a>
          <span className="float-right">
            <FilteringCounterBadge
              name="@state"
              value="unprocessed"
              counter={stateCount.unprocessed}
            />
            <FilteringCounterBadge
              name="@state"
              value="suppressed"
              counter={stateCount.suppressed}
            />
            <FilteringCounterBadge
              name="@state"
              value="active"
              counter={stateCount.active}
            />
            <a
              className="text-muted cursor-pointer badge text-nowrap text-truncate pr-0"
              onClick={collapseStore.toggle}
            >
              <FontAwesomeIcon
                icon={collapseStore.value ? faChevronUp : faChevronDown}
              />
            </a>
          </span>
          <span>
            {Object.keys(labels).map(name => (
              <FilteringLabel key={name} name={name} value={labels[name]} />
            ))}
          </span>
        </h5>
      );
    }
  }
);

export { GroupHeader };

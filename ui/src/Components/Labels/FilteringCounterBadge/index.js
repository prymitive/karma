import React from "react";
import PropTypes from "prop-types";

import { inject, observer } from "mobx-react";

import { BaseLabel } from "Components/Labels/BaseLabel";

// Same as FilteringLabel but for labels that are counters (usually @state)
// and only renders a pill badge with the counter, it doesn't render anything
// if the counter is 0
const FilteringCounterBadge = inject("alertStore")(
  observer(
    class FilteringCounterBadge extends BaseLabel {
      static propTypes = {
        ...BaseLabel.propTypes,
        counter: PropTypes.number.isRequired
      };

      render() {
        const { name, value, counter } = this.props;

        if (counter === 0) return null;

        return (
          <span
            className={`components-label components-label-with-hover text-nowrap text-truncate badge badge-${this.getColorClass(
              name,
              value
            )} badge-pill`}
            style={this.getColorStyle(name, value)}
            onClick={e => this.handleClick(e)}
            data-tooltip={`Only show ${value} alerts`}
          >
            {counter}
          </span>
        );
      }
    }
  )
);

export { FilteringCounterBadge };

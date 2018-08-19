import React from "react";

import { inject, observer } from "mobx-react";

import { BaseLabel } from "Components/Labels/BaseLabel";

// Renders a label element that after clicking adds current label as a filter
const FilteringLabel = inject("alertStore")(
  observer(
    class FilteringLabel extends BaseLabel {
      render() {
        const { name, value } = this.props;
        return (
          <span
            className={`components-label components-label-with-hover text-nowrap text-truncate badge badge-${this.getColorClass(
              name,
              value
            )} mw-100`}
            style={this.getColorStyle(name, value)}
            onClick={e => this.handleClick(e)}
            data-tooltip="Only show alerts matching this label"
          >
            {name}: {value}
          </span>
        );
      }
    }
  )
);

export { FilteringLabel };

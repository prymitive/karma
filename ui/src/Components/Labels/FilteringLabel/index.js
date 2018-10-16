import React from "react";

import { inject, observer } from "mobx-react";

import { TooltipWrapper } from "Components/TooltipWrapper";
import { BaseLabel } from "Components/Labels/BaseLabel";

// Renders a label element that after clicking adds current label as a filter
const FilteringLabel = inject("alertStore")(
  observer(
    class FilteringLabel extends BaseLabel {
      render() {
        const { name, value } = this.props;

        const classNames = [
          "components-label",
          "components-label-with-hover",
          "text-nowrap text-truncate mw-100",
          "badge",
          `badge-${this.getColorClass(name, value)}`,
          this.isBackgroundDark(name, value)
            ? "components-label-dark"
            : "components-label-bright"
        ];

        return (
          <TooltipWrapper title="Click to only show alerts with this label">
            <span
              className={`${classNames.join(" ")}`}
              style={this.getColorStyle(name, value)}
              onClick={e => this.handleClick(e)}
            >
              <span className="components-label-name">{name}:</span>{" "}
              <span className="components-label-value">{value}</span>
            </span>
          </TooltipWrapper>
        );
      }
    }
  )
);

export { FilteringLabel };

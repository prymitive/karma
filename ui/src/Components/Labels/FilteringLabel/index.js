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

        let cs = this.getClassAndStyle(
          name,
          value,
          "components-label-with-hover"
        );

        return (
          <TooltipWrapper title="Click to only show alerts with this label or Alt+Click to hide them">
            <span
              className={cs.className}
              style={cs.style}
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

import React from "react";

import { inject, observer } from "mobx-react";

import { BaseLabel } from "Components/Labels/BaseLabel";

// Renders a static label element, no click actions, no hover
const StaticLabel = inject("alertStore")(
  observer(
    class FilteringLabel extends BaseLabel {
      render() {
        const { name, value } = this.props;

        const classNames = [
          "components-label",
          "text-nowrap text-truncate mw-100",
          "badge",
          `badge-${this.getColorClass(name, value)}`,
          this.isBackgroundDark(name, value)
            ? "components-label-dark"
            : "components-label-bright"
        ];

        return (
          <span
            className={`${classNames.join(" ")}`}
            style={this.getColorStyle(name, value)}
          >
            <span className="components-label-name">{name}:</span>{" "}
            <span className="components-label-value">{value}</span>
          </span>
        );
      }
    }
  )
);

export { StaticLabel };

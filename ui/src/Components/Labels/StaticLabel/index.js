import React from "react";

import { inject, observer } from "mobx-react";

import { BaseLabel } from "Components/Labels/BaseLabel";

// Renders a static label element, no click actions, no hover
const StaticLabel = inject("alertStore")(
  observer(
    class FilteringLabel extends BaseLabel {
      render() {
        const { name, value } = this.props;
        return (
          <span
            className={`components-label text-nowrap text-truncate badge badge-${this.getColorClass(
              name,
              value
            )} mw-100`}
            style={this.getColorStyle(name, value)}
          >
            {name}: {value}
          </span>
        );
      }
    }
  )
);

export { StaticLabel };

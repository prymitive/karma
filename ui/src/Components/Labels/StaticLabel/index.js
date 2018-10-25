import React from "react";

import { inject, observer } from "mobx-react";

import { BaseLabel } from "Components/Labels/BaseLabel";

// Renders a static label element, no click actions, no hover
const StaticLabel = inject("alertStore")(
  observer(
    class FilteringLabel extends BaseLabel {
      render() {
        const { name, value } = this.props;

        let cs = this.getClassAndStyle(name, value);

        return (
          <span className={cs.className} style={cs.style}>
            <span className="components-label-name">{name}:</span>{" "}
            <span className="components-label-value">{value}</span>
          </span>
        );
      }
    }
  )
);

export { StaticLabel };

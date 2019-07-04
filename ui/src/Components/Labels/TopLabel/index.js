import React from "react";
import PropTypes from "prop-types";

import { inject, observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { BaseLabel } from "Components/Labels/BaseLabel";

import "./index.scss";

const TopLabel = inject("alertStore")(
  observer(
    class FilteringLabel extends BaseLabel {
      static propTypes = {
        alertStore: PropTypes.instanceOf(AlertStore).isRequired,
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        percent: PropTypes.number.isRequired
      };

      render() {
        const { name, value, percent } = this.props;

        let cs = this.getClassAndStyle(
          name,
          value,
          "components-label-with-hover pl-0 text-left"
        );

        return (
          <TooltipWrapper title="Click to only show alerts with this label or Alt+Click to hide them">
            <span
              className={cs.className}
              style={cs.style}
              onClick={e => this.handleClick(e)}
            >
              <span className="mr-1 px-1 bg-light text-primary components-toplabel-percent">
                {percent}%
              </span>
              <span className="components-label-name">{name}:</span>{" "}
              <span className="components-label-value">{value}</span>
            </span>
          </TooltipWrapper>
        );
      }
    }
  )
);

export { TopLabel };

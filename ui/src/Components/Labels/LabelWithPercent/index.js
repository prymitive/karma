import React from "react";
import PropTypes from "prop-types";

import { inject, observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { BaseLabel } from "Components/Labels/BaseLabel";

import "./index.scss";

const LabelWithPercent = inject("alertStore")(
  observer(
    class FilteringLabel extends BaseLabel {
      static propTypes = {
        alertStore: PropTypes.instanceOf(AlertStore).isRequired,
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        hits: PropTypes.number.isRequired,
        percent: PropTypes.number.isRequired
      };

      render() {
        const { name, value, hits, percent } = this.props;

        let cs = this.getClassAndStyle(
          name,
          value,
          "components-label-with-hover mb-0 pl-0 text-left"
        );

        const progressBarBg =
          percent > 66
            ? "bg-danger"
            : percent > 33
            ? "bg-warning"
            : "bg-success";

        return (
          <TooltipWrapper title="Click to only show alerts with this label or Alt+Click to hide them">
            <span
              className={cs.className}
              style={cs.style}
              onClick={e => this.handleClick(e)}
            >
              <span className="mr-1 px-1 bg-primary text-white components-labelWithPercent-percent">
                {hits}
              </span>
              <span className="components-label-name">{name}:</span>{" "}
              <span className="components-label-value">{value}</span>
            </span>
            <div className="progress components-labelWithPercent-progress mr-1">
              <div
                className={`progress-bar ${progressBarBg}`}
                role="progressbar"
                style={{ width: percent + "%" }}
                aria-valuenow={percent}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
          </TooltipWrapper>
        );
      }
    }
  )
);

export { LabelWithPercent };

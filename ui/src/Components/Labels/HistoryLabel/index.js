import React from "react";

import { observer } from "mobx-react";

import { BaseLabel } from "Components/Labels/BaseLabel";

import "./index.css";

const HistoryLabel = observer(
  class HistoryLabel extends BaseLabel {
    render() {
      const { name, value } = this.props;
      return (
        <span
          className={`components-label components-label-history text-nowrap text-truncate badge badge-${this.getColorClass(
            name,
            value
          )} mw-100`}
          style={this.getColorStyle(name, value)}
        >
          {name ? `${name}: ` : null}
          {value}
        </span>
      );
    }
  }
);

export { HistoryLabel };

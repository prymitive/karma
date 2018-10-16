import React from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { DefaultLabelClass } from "Common/Colors";
import { QueryOperators } from "Common/Query";
import { AlertStore } from "Stores/AlertStore";
import { BaseLabel } from "Components/Labels/BaseLabel";

import "./index.css";

const HistoryLabel = observer(
  class HistoryLabel extends BaseLabel {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      name: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      matcher: PropTypes.string.isRequired
    };

    render() {
      const { name, matcher, value } = this.props;

      let classNames = [
        "components-label",
        "components-label-history",
        "text-nowrap",
        "text-truncate",
        "badge",
        "mw-100",
        "components-label-value",
        this.isBackgroundDark(name, value)
          ? "components-label-dark"
          : "components-label-bright"
      ];
      let style = {};
      if (matcher === QueryOperators.Equal) {
        classNames.push(`badge-${this.getColorClass(name, value)}`);
        style = this.getColorStyle(name, value);
      } else {
        classNames.push(`badge-${DefaultLabelClass}`);
      }

      return (
        <span className={classNames.join(" ")} style={style}>
          {name ? `${name}${matcher}` : null}
          {value}
        </span>
      );
    }
  }
);

export { HistoryLabel };

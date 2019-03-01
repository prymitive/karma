import { Component } from "react";
import PropTypes from "prop-types";

import { AlertStore } from "Stores/AlertStore";
import {
  StaticColorLabelClass,
  StateLabelClassMap,
  DefaultLabelClass,
  AlertNameLabelClass
} from "Common/Colors";
import { QueryOperators, FormatQuery, StaticLabels } from "Common/Query";

import "./index.scss";

const isBackgroundDark = brightness => brightness <= 125;

// base class for shared code, not used directly
class BaseLabel extends Component {
  static propTypes = {
    alertStore: PropTypes.instanceOf(AlertStore).isRequired,
    name: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired
  };

  getClassAndStyle(name, value, extraClass = "") {
    const { alertStore } = this.props;

    const data = {
      style: {},
      className: "",
      baseClassNames: [
        "components-label",
        "badge",
        "text-nowrap",
        "text-truncate",
        "mw-100"
      ],
      colorClassNames: []
    };

    if (name === StaticLabels.AlertName) {
      data.colorClassNames.push(AlertNameLabelClass);
    } else if (name === StaticLabels.State) {
      data.colorClassNames.push(StateLabelClassMap[value] || DefaultLabelClass);
    } else if (alertStore.settings.values.staticColorLabels.includes(name)) {
      data.colorClassNames.push(StaticColorLabelClass);
    } else {
      const c = alertStore.data.getColorData(name, value);
      if (c) {
        // if there's color information use it
        data.style["backgroundColor"] = `rgba(${[
          c.background.red,
          c.background.green,
          c.background.blue,
          c.background.alpha
        ].join(", ")})`;

        data.colorClassNames.push(
          isBackgroundDark(c.brightness)
            ? "components-label-dark"
            : "components-label-bright"
        );
      } else {
        // if not fall back to class
        data.colorClassNames.push(DefaultLabelClass);
      }
    }
    data.className = `${[...data.baseClassNames, ...data.colorClassNames].join(
      " "
    )} ${extraClass}`;

    return data;
  }

  handleClick = event => {
    // left click       => apply foo=bar filter
    // left click + alt => apply foo!=bar filter
    const operator =
      event.altKey === true ? QueryOperators.NotEqual : QueryOperators.Equal;

    event.preventDefault();

    const { name, value, alertStore } = this.props;
    alertStore.filters.addFilter(FormatQuery(name, operator, value));
  };
}

export { BaseLabel };

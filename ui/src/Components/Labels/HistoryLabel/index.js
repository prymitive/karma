import React from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { QueryOperators } from "Common/Query";
import { AlertStore } from "Stores/AlertStore";
import { BaseLabel } from "Components/Labels/BaseLabel";

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

      let cs = this.getClassAndStyle(
        matcher === QueryOperators.Equal ? name : "",
        matcher === QueryOperators.Equal ? value : "",
        "components-label-history components-label-value"
      );

      return (
        <span className={cs.className} style={cs.style}>
          {name ? `${name}${matcher}` : null}
          {value}
        </span>
      );
    }
  }
);

export { HistoryLabel };

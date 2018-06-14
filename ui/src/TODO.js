import React, { PureComponent } from "react";
import PropTypes from "prop-types";

export default class TODO extends PureComponent {
  static propTypes = {
    name: PropTypes.string
  };

  render() {
    //console.warn("TODO");
    return (
      <div style={{ border: "1px solid red" }}>{this.props.name || "TODO"}</div>
    );
  }
}

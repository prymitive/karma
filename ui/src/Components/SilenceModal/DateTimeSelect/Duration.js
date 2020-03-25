import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";

const Duration = observer(
  class Duration extends Component {
    static propTypes = {
      value: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
      onInc: PropTypes.func.isRequired,
      onDec: PropTypes.func.isRequired,
    };

    render() {
      const { value, label, onInc, onDec } = this.props;

      return (
        <div>
          <table className="w-100">
            <tbody>
              <tr>
                <td className="w-50 text-center">
                  <span onClick={onInc}>
                    <FontAwesomeIcon
                      icon={faAngleUp}
                      size="2x"
                      className="text-muted cursor-pointer"
                    />
                  </span>
                </td>
                <td className="w-50" />
              </tr>
              <tr>
                <td className="w-50 text-center">
                  <h2>{value}</h2>
                </td>
                <td className="w-50">
                  <span className="text-muted ml-2">{label}</span>
                </td>
              </tr>
              <tr>
                <td className="w-50 text-center">
                  <span onClick={onDec}>
                    <FontAwesomeIcon
                      icon={faAngleDown}
                      size="2x"
                      className="text-muted cursor-pointer"
                    />
                  </span>
                </td>
                <td className="w-50" />
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
  }
);

export { Duration };

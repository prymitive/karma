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
      label: PropTypes.string,
      onInc: PropTypes.func.isRequired,
      onDec: PropTypes.func.isRequired
    };

    render() {
      const { value, label, onInc, onDec } = this.props;

      return (
        <table>
          <tbody>
            <tr>
              <td className="text-center">
                <span onClick={onInc}>
                  <FontAwesomeIcon
                    icon={faAngleUp}
                    size="2x"
                    className="text-muted cursor-pointer"
                  />
                </span>
              </td>
              <td width="50%" />
            </tr>
            <tr>
              <td className="text-center">
                <h2>{value}</h2>
              </td>
              <td width="50%">
                {label ? (
                  <span className="text-muted ml-2">{label}</span>
                ) : null}
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <span onClick={onDec}>
                  <FontAwesomeIcon
                    icon={faAngleDown}
                    size="2x"
                    className="text-muted cursor-pointer"
                  />
                </span>
              </td>
              <td width="50%" />
            </tr>
          </tbody>
        </table>
      );
    }
  }
);

export { Duration };

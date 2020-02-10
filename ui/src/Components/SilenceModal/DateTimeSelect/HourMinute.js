import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import moment from "moment";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";

const IconTd = ({ icon, onClick }) => (
  <td>
    <span onClick={onClick}>
      <FontAwesomeIcon
        icon={icon}
        size="2x"
        className="text-muted cursor-pointer"
      />
    </span>
  </td>
);
IconTd.propTypes = {
  icon: FontAwesomeIcon.propTypes.icon.isRequired,
  onClick: PropTypes.func.isRequired
};

const HourMinute = observer(
  class HourMinute extends Component {
    static propTypes = {
      dateValue: PropTypes.instanceOf(moment).isRequired,
      onHourInc: PropTypes.func.isRequired,
      onHourDec: PropTypes.func.isRequired,
      onMinuteInc: PropTypes.func.isRequired,
      onMinuteDec: PropTypes.func.isRequired
    };

    render() {
      const {
        dateValue,
        onHourInc,
        onHourDec,
        onMinuteInc,
        onMinuteDec
      } = this.props;

      const hour = dateValue.hour();
      const minute = dateValue.minute();

      return (
        <div className="d-flex justify-content-center align-items-center">
          <table className="text-center border-0">
            <tbody>
              <tr>
                <IconTd icon={faAngleUp} onClick={onHourInc} />
                <td />
                <IconTd icon={faAngleUp} onClick={onMinuteInc} />
              </tr>
              <tr>
                <td>
                  <h2>{hour > 9 ? hour : `0${hour}`}</h2>
                </td>
                <td>
                  <h2 className="mx-2">:</h2>
                </td>
                <td>
                  <h2>{minute > 9 ? minute : `0${minute}`}</h2>
                </td>
              </tr>
              <tr>
                <IconTd icon={faAngleDown} onClick={onHourDec} />
                <td />
                <IconTd icon={faAngleDown} onClick={onMinuteDec} />
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
  }
);

export { HourMinute };

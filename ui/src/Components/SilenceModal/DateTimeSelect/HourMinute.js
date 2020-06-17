import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";

const IconTd = ({ icon, onClick, onWheel, className }) => (
  <td className={className} onWheel={onWheel}>
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
  onClick: PropTypes.func.isRequired,
  onWheel: PropTypes.func.isRequired,
  className: PropTypes.string.isRequired,
};

const HourMinute = observer(
  ({ dateValue, onHourInc, onHourDec, onMinuteInc, onMinuteDec }) => {
    const rootRef = useRef(null);

    useEffect(() => {
      const cancelWheel = (event) => event.preventDefault();

      const elem = rootRef.current;

      elem.addEventListener("wheel", cancelWheel, { passive: false });

      return () => {
        elem.removeEventListener("wheel", cancelWheel);
      };
    }, []);

    const onHourWheel = (event) => {
      if (event.deltaY < 0) {
        onHourInc();
      } else {
        onHourDec();
      }
    };

    const onMinuteWheel = (event) => {
      if (event.deltaY < 0) {
        onMinuteInc();
      } else {
        onMinuteDec();
      }
    };

    const hour = dateValue.getHours();
    const minute = dateValue.getMinutes();

    return (
      <div
        ref={rootRef}
        className="d-flex justify-content-center align-items-center components-hour-minute"
      >
        <table className="text-center border-0">
          <tbody>
            <tr>
              <IconTd
                icon={faAngleUp}
                onClick={onHourInc}
                onWheel={onHourWheel}
                className="components-hour-up"
              />
              <td />
              <IconTd
                icon={faAngleUp}
                onClick={onMinuteInc}
                onWheel={onMinuteWheel}
                className="components-minute-up"
              />
            </tr>
            <tr>
              <td className="components-hour" onWheel={onHourWheel}>
                <h2>{hour > 9 ? hour : `0${hour}`}</h2>
              </td>
              <td>
                <h2 className="mx-2">:</h2>
              </td>
              <td className="components-minute" onWheel={onMinuteWheel}>
                <h2>{minute > 9 ? minute : `0${minute}`}</h2>
              </td>
            </tr>
            <tr>
              <IconTd
                icon={faAngleDown}
                onClick={onHourDec}
                onWheel={onHourWheel}
                className="components-hour-down"
              />
              <td />
              <IconTd
                icon={faAngleDown}
                onClick={onMinuteDec}
                onWheel={onMinuteWheel}
                className="components-minute-down"
              />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);
HourMinute.propTypes = {
  dateValue: PropTypes.instanceOf(Date).isRequired,
  onHourInc: PropTypes.func.isRequired,
  onHourDec: PropTypes.func.isRequired,
  onMinuteInc: PropTypes.func.isRequired,
  onMinuteDec: PropTypes.func.isRequired,
};

export { HourMinute };

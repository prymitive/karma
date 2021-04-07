import { FC, useEffect, useRef, MouseEvent, WheelEvent } from "react";

import { observer } from "mobx-react-lite";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";

const IconTd: FC<{
  icon: IconDefinition;
  onClick: (event: MouseEvent) => void;
  onWheel: (event: WheelEvent) => void;
  className: string;
}> = ({ icon, onClick, onWheel, className }) => (
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

const HourMinute: FC<{
  dateValue: Date;
  onHourInc: () => void;
  onHourDec: () => void;
  onMinuteInc: () => void;
  onMinuteDec: () => void;
}> = observer(
  ({ dateValue, onHourInc, onHourDec, onMinuteInc, onMinuteDec }) => {
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const cancelWheel = (event: Event) => event.preventDefault();

      const elem = rootRef.current as HTMLDivElement;

      elem.addEventListener("wheel", cancelWheel, { passive: false });

      return () => {
        elem.removeEventListener("wheel", cancelWheel);
      };
    }, []);

    const onHourWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        onHourInc();
      } else {
        onHourDec();
      }
    };

    const onMinuteWheel = (event: WheelEvent) => {
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
                className="components-hour-up with-click"
              />
              <td />
              <IconTd
                icon={faAngleUp}
                onClick={onMinuteInc}
                onWheel={onMinuteWheel}
                className="components-minute-up with-click"
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
                className="components-hour-down with-click"
              />
              <td />
              <IconTd
                icon={faAngleDown}
                onClick={onMinuteDec}
                onWheel={onMinuteWheel}
                className="components-minute-down with-click"
              />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);

export { HourMinute };

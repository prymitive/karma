import { FC, useEffect, useRef } from "react";

import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";

const Duration: FC<{
  value: number;
  label: string;
  onInc: () => void;
  onDec: () => void;
}> = observer(({ value, label, onInc, onDec }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cancelWheel = (event: Event) => event.preventDefault();

    const elem = rootRef.current as HTMLDivElement;

    elem.addEventListener("wheel", cancelWheel, { passive: false });

    return () => {
      elem.removeEventListener("wheel", cancelWheel);
    };
  }, []);

  const onWheel = (deltaY: number) => {
    if (deltaY < 0) {
      onInc();
    } else {
      onDec();
    }
  };

  return (
    <div
      ref={rootRef}
      onWheel={(event) => onWheel(event.deltaY)}
      className="components-duration"
    >
      <table className="w-100">
        <tbody>
          <tr>
            <td className="w-50 text-center with-click px-2">
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
              <span className="text-muted ms-2">{label}</span>
            </td>
          </tr>
          <tr>
            <td className="w-50 text-center with-click px-2">
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
});

export { Duration };

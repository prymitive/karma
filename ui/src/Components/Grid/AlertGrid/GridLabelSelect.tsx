import React, {
  FC,
  Ref,
  CSSProperties,
  useRef,
  useState,
  useCallback,
} from "react";

import { observer } from "mobx-react-lite";

import { Manager, Reference, Popper } from "react-popper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";

import { Settings } from "Stores/Settings";
import { CommonPopperModifiers } from "Common/Popper";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { useOnClickOutside } from "Hooks/useOnClickOutside";
import { GridLabelName } from "Components/MainModal/Configuration/GridLabelName";

const NullContainer: FC = () => null;

const Dropdown: FC<{
  popperPlacement?: string;
  popperRef?: Ref<HTMLDivElement>;
  popperStyle?: CSSProperties;
  settingsStore: Settings;
}> = ({ popperPlacement, popperRef, popperStyle, settingsStore }) => {
  return (
    <div
      className="dropdown-menu d-block shadow components-grid-label-select-menu border-0 p-0"
      ref={popperRef}
      style={{
        fontSize: "1rem",
        fontWeight: "normal",
        ...popperStyle,
      }}
      data-placement={popperPlacement}
    >
      <GridLabelName
        settingsStore={settingsStore}
        isOpen={true}
        selectComponents={{
          ClearIndicator: null,
          IndicatorSeparator: null,
          DropdownIndicator: null,
          ValueContainer: NullContainer,
          Control: NullContainer,
        }}
      />
    </div>
  );
};

const GridLabelSelect: FC<{
  settingsStore: Settings;
}> = observer(({ settingsStore }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(!isVisible), [isVisible]);

  const ref = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(ref, hide, isVisible);

  return (
    <div ref={ref} className="components-label badge pl-1 pr-2">
      <Manager>
        <Reference>
          {({ ref }) => (
            <span
              ref={ref}
              onClick={toggle}
              className="border-0 rounded-0 bg-inherit cursor-pointer px-1 py-0 components-grid-label-select-dropdown"
              data-toggle="dropdown"
            >
              <FontAwesomeIcon className="text-muted" icon={faCaretDown} />
            </span>
          )}
        </Reference>
        <DropdownSlide in={isVisible} unmountOnExit>
          <Popper modifiers={CommonPopperModifiers}>
            {({ placement, ref, style }) => (
              <Dropdown
                popperPlacement={placement}
                popperRef={ref}
                popperStyle={style}
                settingsStore={settingsStore}
              />
            )}
          </Popper>
        </DropdownSlide>
      </Manager>
    </div>
  );
});

export { GridLabelSelect };

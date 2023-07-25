import React, {
  FC,
  Ref,
  CSSProperties,
  useRef,
  useState,
  useCallback,
} from "react";

import { observer } from "mobx-react-lite";

import { useFloating, shift, offset } from "@floating-ui/react-dom";

import type { OnChangeValue } from "react-select";
import AsyncSelect from "react-select/async";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";

import type { AlertStore } from "Stores/AlertStore";
import type { Settings } from "Stores/Settings";
import type { APIGridT } from "Models/APITypes";
import { StringToOption, OptionT } from "Common/Select";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { ThemeContext } from "Components/Theme";
import { useOnClickOutside } from "Hooks/useOnClickOutside";

const specialLabels: OptionT[] = [
  { label: "Automatic selection", value: "@auto", wasCreated: false },
  { label: "@alertmanager", value: "@alertmanager", wasCreated: false },
  { label: "@cluster", value: "@cluster", wasCreated: false },
  { label: "@receiver", value: "@receiver", wasCreated: false },
];

const NullContainer: FC = () => null;

const GridLabelNameSelect: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
  grid: APIGridT;
  onClose: () => void;
}> = ({ alertStore, settingsStore, grid, onClose }) => {
  const loadOptions = (
    inputValue: string,
    callback: (options: OptionT[]) => void,
  ) => {
    const autoEnabled =
      settingsStore.multiGridConfig.config.gridLabel === "@auto";
    const options = [
      ...specialLabels.filter(
        (val) =>
          val.value !== "@auto" || (val.value === "@auto" && !autoEnabled),
      ),
      ...alertStore.data.labelNames
        .filter(
          (labelName) =>
            autoEnabled === true ||
            (autoEnabled === false && labelName !== grid.labelName),
        )
        .sort()
        .map((key) => StringToOption(key)),
    ];

    callback(options);
  };

  const context = React.useContext(ThemeContext);

  return (
    <AsyncSelect
      styles={context.reactSelectStyles}
      classNamePrefix="react-select"
      loadOptions={loadOptions}
      defaultOptions
      onChange={(option: OnChangeValue<OptionT, false>) => {
        settingsStore.multiGridConfig.setGridLabel((option as OptionT).value);
        onClose();
      }}
      menuIsOpen={true}
      components={{
        ClearIndicator: NullContainer,
        IndicatorSeparator: null,
        DropdownIndicator: null,
        ValueContainer: NullContainer,
        Control: NullContainer,
      }}
    />
  );
};

const Dropdown: FC<{
  x: number | null;
  y: number | null;
  floating: Ref<HTMLDivElement> | null;
  strategy: CSSProperties["position"];
  alertStore: AlertStore;
  settingsStore: Settings;
  grid: APIGridT;
  onClose: () => void;
}> = ({
  x,
  y,
  floating,
  strategy,
  alertStore,
  settingsStore,
  grid,
  onClose,
}) => {
  return (
    <div
      className="dropdown-menu d-block shadow components-grid-label-select-menu border-0 p-0 m-0"
      ref={floating}
      style={{
        fontSize: "1rem",
        fontWeight: "normal",
        position: strategy,
        top: y ?? "",
        left: x ?? "",
      }}
    >
      <GridLabelNameSelect
        alertStore={alertStore}
        settingsStore={settingsStore}
        grid={grid}
        onClose={onClose}
      />
    </div>
  );
};

const GridLabelSelect: FC<{
  alertStore: AlertStore;
  settingsStore: Settings;
  grid: APIGridT;
}> = observer(({ alertStore, settingsStore, grid }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);
  const ref = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(ref, hide, isVisible);

  const { x, y, refs, strategy } = useFloating({
    placement: "bottom",
    middleware: [shift(), offset(5)],
  });

  return (
    <div ref={ref} className="components-label badge ps-1 pe-2">
      <span
        ref={refs.setReference}
        onClick={toggle}
        className="border-0 rounded-0 bg-inherit cursor-pointer px-1 py-0 components-grid-label-select-dropdown"
        data-toggle="dropdown"
      >
        <FontAwesomeIcon className="text-muted" icon={faCaretDown} />
      </span>
      <DropdownSlide in={isVisible} unmountOnExit>
        <Dropdown
          alertStore={alertStore}
          settingsStore={settingsStore}
          grid={grid}
          onClose={toggle}
          x={x}
          y={y}
          floating={refs.setFloating}
          strategy={strategy}
        />
      </DropdownSlide>
    </div>
  );
});

export { GridLabelSelect };

import React, {
  FC,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  MouseEvent,
  ReactNode,
} from "react";

import { observer } from "mobx-react-lite";

import debounce from "lodash.debounce";

import type { SizeDetail } from "bricks.js";

import TransitionGroup from "react-transition-group/TransitionGroup";
import { CSSTransition } from "react-transition-group";

import FontFaceObserver from "fontfaceobserver";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleDown } from "@fortawesome/free-solid-svg-icons/faAngleDoubleDown";

import type { AlertStore } from "Stores/AlertStore";
import type { Settings } from "Stores/Settings";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import type { APIGridT } from "Models/APITypes";
import { useGrid } from "Hooks/useGrid";
import { ThemeContext } from "Components/Theme";
import { DefaultDetailsCollapseValue } from "./AlertGroup/DetailsToggle";
import AlertGroup from "./AlertGroup";
import { Swimlane } from "./Swimlane";

const SwimlaneTransition: FC<{
  children: React.ReactElement<{ ref?: React.Ref<HTMLHeadingElement> }>;
  labelValue: string;
  inProp: boolean;
  timeout: number;
}> = ({ children, labelValue, inProp, timeout }) => {
  const nodeRef = useRef<HTMLHeadingElement>(null);
  return (
    <CSSTransition
      key={labelValue}
      in={inProp}
      classNames="components-animation-fade"
      timeout={timeout}
      appear
      unmountOnExit
      nodeRef={nodeRef}
    >
      {React.cloneElement(children, { ref: nodeRef })}
    </CSSTransition>
  );
};

const AlertGroupTransition: FC<{
  children: React.ReactElement<{ ref?: React.Ref<HTMLDivElement> }>;
  groupId: string;
  classNames: string;
  timeout: number;
  onEntering: () => void;
  onExited: () => void;
  in?: boolean;
  appear?: boolean;
}> = ({
  children,
  groupId,
  classNames,
  timeout,
  onEntering,
  onExited,
  in: inProp,
  appear,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <CSSTransition
      key={groupId}
      classNames={classNames}
      timeout={timeout}
      onEntering={onEntering}
      onExited={onExited}
      unmountOnExit
      nodeRef={nodeRef}
      in={inProp}
      appear={appear}
    >
      {React.cloneElement(children, { ref: nodeRef })}
    </CSSTransition>
  );
};

const LoadMoreTransition: FC<{
  children: ReactNode;
  timeout: number;
  in?: boolean;
}> = ({ children, timeout, in: inProp }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <CSSTransition
      classNames="components-animation-fade"
      timeout={timeout}
      unmountOnExit
      nodeRef={nodeRef}
      in={inProp}
    >
      <div ref={nodeRef}>{children}</div>
    </CSSTransition>
  );
};

const Grid: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
  gridSizesConfig: SizeDetail[];
  groupWidth: number;
  grid: APIGridT;
  outerPadding: number;
  paddingTop: number;
  zIndex: number;
}> = ({
  alertStore,
  settingsStore,
  silenceFormStore,
  gridSizesConfig,
  groupWidth,
  grid,
  outerPadding,
  paddingTop,
  zIndex,
}) => {
  const context = React.useContext(ThemeContext);
  const { ref, repack } = useGrid(gridSizesConfig);
  const debouncedRepack = useMemo(() => debounce(() => repack(), 10), [repack]);

  const [isExpanded, setIsExpanded] = useState<boolean>(
    !DefaultDetailsCollapseValue(settingsStore),
  );
  const toggleIsExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
    debouncedRepack();
  }, [debouncedRepack, isExpanded]);

  const onCollapseClick = (event: MouseEvent) => {
    // left click       => toggle current grid
    // left click + alt => toggle all grids

    if (event.altKey === true) {
      const toggleEvent = new CustomEvent("alertGridCollapse", {
        detail: !isExpanded,
      });
      window.dispatchEvent(toggleEvent);
    } else {
      toggleIsExpanded();
    }
  };

  const onAlertGridCollapseEvent = useCallback(
    (event: Event) => {
      setIsExpanded((event as CustomEvent).detail);
      debouncedRepack();
    },
    [debouncedRepack],
  );

  useEffect(() => {
    // We have font-display:swap set for font assets, this means that on initial
    // render a fallback font might be used and later swapped for the final one
    // (once the final font is loaded). This means that fallback font might
    // render to a different size and the swap can result in component resize.
    // For our grid this resize might leave gaps since everything uses fixed
    // position, so we use font observer and trigger repack when fonts are loaded
    for (const fontWeight of [300, 400, 600]) {
      const font = new FontFaceObserver("Open Sans", {
        weight: fontWeight,
      });
      // wait up to 30s, run no-op function on timeout
      font.load(null, 30000).then(debouncedRepack, () => {});
    }

    window.addEventListener("alertGridCollapse", onAlertGridCollapseEvent);
    return () => {
      window.removeEventListener("alertGridCollapse", onAlertGridCollapseEvent);
    };
  }, [debouncedRepack, onAlertGridCollapseEvent]);

  useEffect(() => {
    repack();
  });

  return (
    <div
      style={{
        position: "relative",
        zIndex: zIndex,
      }}
    >
      <SwimlaneTransition
        labelValue={grid.labelValue}
        inProp={grid.labelName !== ""}
        timeout={context.animations.duration}
      >
        <Swimlane
          alertStore={alertStore}
          settingsStore={settingsStore}
          grid={grid}
          isExpanded={isExpanded}
          onToggle={onCollapseClick}
          paddingTop={paddingTop}
        />
      </SwimlaneTransition>
      <div
        className="components-grid"
        ref={ref}
        key={settingsStore.gridConfig.config.groupWidth}
        style={{
          paddingLeft: outerPadding + "px",
          paddingRight: outerPadding + "px",
        }}
      >
        <TransitionGroup component={null} appear enter exit>
          {isExpanded || grid.labelName === ""
            ? grid.alertGroups.map((group) => (
                <AlertGroupTransition
                  key={group.id}
                  groupId={group.id}
                  classNames={
                    context.animations.duration
                      ? "components-animation-alergroup"
                      : ""
                  }
                  timeout={context.animations.duration}
                  onEntering={repack}
                  onExited={debouncedRepack}
                >
                  <AlertGroup
                    grid={grid}
                    group={group}
                    afterUpdate={debouncedRepack}
                    alertStore={alertStore}
                    settingsStore={settingsStore}
                    silenceFormStore={silenceFormStore}
                    groupWidth={groupWidth}
                    gridLabelValue={grid.labelValue}
                  />
                </AlertGroupTransition>
              ))
            : []}
        </TransitionGroup>
      </div>
      <TransitionGroup component={null} enter exit>
        {isExpanded && grid.totalGroups > grid.alertGroups.length && (
          <LoadMoreTransition timeout={context.animations.duration}>
            <div className="d-flex flex-row justify-content-between">
              <div className="flex-shrink-1 flex-grow-1 text-center">
                <button
                  type="button"
                  className="btn btn-secondary mb-3"
                  onClick={() => {
                    alertStore.ui.setGridGroupLimit(
                      grid.labelName,
                      grid.labelValue,
                      grid.alertGroups.length +
                        alertStore.settings.values.gridGroupLimit,
                    );
                  }}
                >
                  <FontAwesomeIcon className="me-2" icon={faAngleDoubleDown} />
                  Load more
                </button>
              </div>
            </div>
          </LoadMoreTransition>
        )}
      </TransitionGroup>
    </div>
  );
};

export default observer(Grid);

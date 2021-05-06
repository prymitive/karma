import React, {
  FC,
  useEffect,
  useState,
  useCallback,
  useMemo,
  MouseEvent,
} from "react";

import { observer } from "mobx-react-lite";

import debounce from "lodash.debounce";

import { SizeDetail } from "bricks.js";

import TransitionGroup from "react-transition-group/TransitionGroup";
import { CSSTransition } from "react-transition-group";

import FontFaceObserver from "fontfaceobserver";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleDown } from "@fortawesome/free-solid-svg-icons/faAngleDoubleDown";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { APIGridT } from "Models/APITypes";
import { useGrid } from "Hooks/useGrid";
import { ThemeContext } from "Components/Theme";
import { DefaultDetailsCollapseValue } from "./AlertGroup/DetailsToggle";
import AlertGroup from "./AlertGroup";
import { Swimlane } from "./Swimlane";

const Grid: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
  gridSizesConfig: SizeDetail[];
  groupWidth: number;
  grid: APIGridT;
  outerPadding: number;
}> = ({
  alertStore,
  settingsStore,
  silenceFormStore,
  gridSizesConfig,
  groupWidth,
  grid,
  outerPadding,
}) => {
  const context = React.useContext(ThemeContext);
  const { ref, repack } = useGrid(gridSizesConfig);
  const debouncedRepack = useMemo(() => debounce(() => repack(), 10), [repack]);

  const [groupsToRender, setGroupsToRender] = useState<number>(50);

  const [isExpanded, setIsExpanded] = useState<boolean>(
    !DefaultDetailsCollapseValue(settingsStore)
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
    (event) => {
      setIsExpanded(event.detail);
      debouncedRepack();
    },
    [debouncedRepack]
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
    if (groupsToRender > grid.alertGroups.length) {
      setGroupsToRender(Math.max(50, grid.alertGroups.length));
    }
  }, [grid.alertGroups.length, groupsToRender]);

  useEffect(() => {
    repack();
  });

  return (
    <>
      <CSSTransition
        key={grid.labelValue}
        in={grid.labelName !== ""}
        classNames="components-animation-fade"
        timeout={context.animations.duration}
        appear
        unmountOnExit
      >
        <Swimlane
          alertStore={alertStore}
          settingsStore={settingsStore}
          grid={grid}
          isExpanded={isExpanded}
          onToggle={onCollapseClick}
        />
      </CSSTransition>
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
            ? grid.alertGroups.slice(0, groupsToRender).map((group) => (
                <CSSTransition
                  key={group.id}
                  classNames={
                    context.animations.duration
                      ? "components-animation-fade"
                      : ""
                  }
                  timeout={context.animations.duration}
                  onEntering={repack}
                  onExited={debouncedRepack}
                  unmountOnExit
                >
                  <AlertGroup
                    group={group}
                    showAlertmanagers={
                      Object.keys(alertStore.data.upstreams.clusters).length > 1
                    }
                    afterUpdate={debouncedRepack}
                    alertStore={alertStore}
                    settingsStore={settingsStore}
                    silenceFormStore={silenceFormStore}
                    groupWidth={groupWidth}
                    gridLabelValue={grid.labelValue}
                  />
                </CSSTransition>
              ))
            : []}
        </TransitionGroup>
      </div>
      <TransitionGroup component={null} enter exit>
        {isExpanded && grid.alertGroups.length > groupsToRender && (
          <CSSTransition
            classNames="components-animation-fade"
            timeout={context.animations.duration}
            unmountOnExit
          >
            <div className="d-flex flex-row justify-content-between">
              <div className="flex-shrink-1 flex-grow-1 text-center">
                <button
                  type="button"
                  className="btn btn-secondary mb-3"
                  onClick={() =>
                    setGroupsToRender(
                      Math.min(groupsToRender + 30, grid.alertGroups.length)
                    )
                  }
                >
                  <FontAwesomeIcon className="me-2" icon={faAngleDoubleDown} />
                  Load more
                </button>
              </div>
            </div>
          </CSSTransition>
        )}
      </TransitionGroup>
    </>
  );
};

export default observer(Grid);

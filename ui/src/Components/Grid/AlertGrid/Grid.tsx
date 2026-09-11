import {
  use,
  FC,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
  useDeferredValue,
  useRef,
  useEffectEvent,
  startTransition,
  MouseEvent,
  ViewTransition,
} from "react";

import { observer } from "mobx-react-lite";

import { debounce } from "es-toolkit";

import type { SizeDetail } from "bricks.js";

import FontFaceObserver from "fontfaceobserver";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleDown } from "@fortawesome/free-solid-svg-icons/faAngleDoubleDown";

import type { AlertStore } from "Stores/AlertStore";
import type { Settings } from "Stores/Settings";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import type { APIGridT, ReadOnly } from "Models/APITypes";
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
  grid: ReadOnly<APIGridT>;
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
  const context = use(ThemeContext);
  const { ref, repack } = useGrid(gridSizesConfig);

  // Must be the same as exit animation duration of alert groups.
  const alertGroupExitDuration = 500;

  // While alert groups exit the grid keeps its space, every repack is
  // held until the exit animation is done.
  const repackHoldUntilRef = useRef(0);

  const heldRepack = useCallback(() => {
    const wait = repackHoldUntilRef.current - Date.now();
    if (wait > 0) {
      window.setTimeout(repack, wait);
      return;
    }
    repack();
  }, [repack]);

  const debouncedRepack = useMemo(
    () => debounce(() => heldRepack(), 10),
    [heldRepack],
  );

  const isAnimated = context.animations.duration !== 0;
  const fadeAnimation = isAnimated ? "components-animation-fade" : "none";
  const alertGroupAnimation = isAnimated
    ? "components-animation-alergroup"
    : "none";

  const [isExpanded, setIsExpanded] = useState<boolean>(
    () => !DefaultDetailsCollapseValue(settingsStore),
  );
  const toggleIsExpanded = useCallback(() => {
    // Wrapped in a Transition so groups animate in and out on toggle.
    startTransition(() => {
      setIsExpanded(!isExpanded);
    });
  }, [isExpanded]);

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

  const onAlertGridCollapseEvent = useEffectEvent((event: Event) => {
    setIsExpanded((event as CustomEvent).detail);
  });

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
  }, [debouncedRepack]);

  useEffect(() => {
    debouncedRepack();
  });

  // Store changes render urgently, these values are deferred so group and
  // label mounts render inside a Transition and animate.
  const showSwimlane = useDeferredValue(grid.labelName !== "");
  const showGroups = useDeferredValue(isExpanded || grid.labelName === "");
  const alertGroups = useDeferredValue(grid.alertGroups);
  const showLoadMore = useDeferredValue(
    isExpanded && grid.totalGroups > grid.alertGroups.length,
  );

  const visibleGroupCount = showGroups ? alertGroups.length : 0;
  const previousGroupCountRef = useRef(visibleGroupCount);

  // Groups are positioned before the browser captures the new state, so
  // they animate in at their final position; when groups are removed the
  // exit animation keeps the space and holds every repack until it is
  // done.
  useLayoutEffect(() => {
    if (visibleGroupCount < previousGroupCountRef.current && isAnimated) {
      repackHoldUntilRef.current = Date.now() + alertGroupExitDuration;
    } else {
      repack();
    }
    previousGroupCountRef.current = visibleGroupCount;
  }, [repack, visibleGroupCount, isAnimated]);

  return (
    <div
      style={{
        position: "relative",
        zIndex: zIndex,
      }}
    >
      {showSwimlane ? (
        <ViewTransition
          default="none"
          enter={fadeAnimation}
          exit={fadeAnimation}
        >
          <Swimlane
            alertStore={alertStore}
            settingsStore={settingsStore}
            grid={grid}
            isExpanded={isExpanded}
            onToggle={onCollapseClick}
            paddingTop={paddingTop}
          />
        </ViewTransition>
      ) : null}
      <div
        className="components-grid"
        ref={ref}
        key={settingsStore.gridConfig.config.groupWidth}
        style={{
          paddingLeft: outerPadding + "px",
          paddingRight: outerPadding + "px",
        }}
      >
        {showGroups
          ? alertGroups.map((group) => (
              <ViewTransition
                key={group.id}
                default="none"
                enter={alertGroupAnimation}
                exit={alertGroupAnimation}
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
              </ViewTransition>
            ))
          : null}
      </div>
      {showLoadMore ? (
        <ViewTransition
          default="none"
          enter={fadeAnimation}
          exit={fadeAnimation}
        >
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
        </ViewTransition>
      ) : null}
    </div>
  );
};

export default observer(Grid);

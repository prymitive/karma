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

let fontsReady: Promise<unknown> | null = null;

const waitForFonts = () => {
  if (fontsReady === null) {
    fontsReady = Promise.allSettled(
      [300, 400, 600].map((weight) =>
        new FontFaceObserver("Open Sans", { weight }).load(null, 30000),
      ),
    );
  }
  return fontsReady;
};

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
  const repackTimerRef = useRef<number | undefined>(undefined);

  const heldRepack = useCallback(() => {
    const wait = repackHoldUntilRef.current - Date.now();
    window.clearTimeout(repackTimerRef.current);
    if (wait > 0) {
      repackTimerRef.current = window.setTimeout(repack, wait);
      return;
    }
    repackTimerRef.current = undefined;
    repack();
  }, [repack]);

  const debouncedRepack = useMemo(
    () => debounce(() => heldRepack(), 10),
    [heldRepack],
  );

  const isAnimated = context.animations.duration !== 0;
  const fadeAnimation = isAnimated ? "components-animation-fade" : "none";
  const alertGroupExitAnimation = isAnimated
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
    waitForFonts().then(debouncedRepack);
    window.addEventListener("alertGridCollapse", onAlertGridCollapseEvent);
    return () => {
      window.removeEventListener("alertGridCollapse", onAlertGridCollapseEvent);
      window.clearTimeout(repackTimerRef.current);
      debouncedRepack.cancel();
    };
  }, [debouncedRepack]);

  // Store changes are deferred only when animations are on.
  const rawShowSwimlane = grid.labelName !== "";
  const rawShowGroups = isExpanded || grid.labelName === "";
  const rawAlertGroups = grid.alertGroups;
  const rawShowLoadMore =
    isExpanded && grid.totalGroups > grid.alertGroups.length;
  const deferredShowSwimlane = useDeferredValue(rawShowSwimlane);
  const deferredShowGroups = useDeferredValue(rawShowGroups);
  const deferredAlertGroups = useDeferredValue(rawAlertGroups);
  const deferredShowLoadMore = useDeferredValue(rawShowLoadMore);
  const showSwimlane = isAnimated ? deferredShowSwimlane : rawShowSwimlane;
  const showGroups = isAnimated ? deferredShowGroups : rawShowGroups;
  const alertGroups =
    isAnimated && rawAlertGroups.length < deferredAlertGroups.length
      ? deferredAlertGroups
      : rawAlertGroups;
  const showLoadMore = isAnimated ? deferredShowLoadMore : rawShowLoadMore;

  const visibleGroupCount = showGroups ? alertGroups.length : 0;
  const previousGroupCountRef = useRef(visibleGroupCount);

  // Groups are positioned before the browser captures the new state, so
  // they animate in at their final position; when groups are removed the
  // exit animation keeps the space and holds every repack until it is
  // done.
  useLayoutEffect(() => {
    if (visibleGroupCount < previousGroupCountRef.current && isAnimated) {
      repackHoldUntilRef.current = Date.now() + alertGroupExitDuration;
      heldRepack();
    } else {
      repack();
    }
    previousGroupCountRef.current = visibleGroupCount;
  }, [heldRepack, repack, visibleGroupCount, isAnimated]);

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
                enter="none"
                exit={alertGroupExitAnimation}
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

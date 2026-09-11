import { useSyncExternalStore } from "react";

interface Dimensions {
  width: number;
  height: number;
}

// All subscribers share one resize listener.
let size: Dimensions = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const listeners = new Set<() => void>();

const onResize = () => {
  size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  // Refreshing here makes React re-check the snapshot right after it
  // subscribes, so a freshly mounted component never renders with a size
  // from before its own mount.
  size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("resize", onResize);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("resize", onResize);
    }
  };
};

const getSnapshot = () => size;

function useWindowSize(): Dimensions {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export { useWindowSize };

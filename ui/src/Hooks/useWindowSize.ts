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
  if (listeners.size === 0) {
    size = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    window.addEventListener("resize", onResize);
  }
  listeners.add(listener);
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

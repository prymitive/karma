import { useSyncExternalStore } from "react";

let supportsTouch = false;
const listeners = new Set<() => void>();

const onTouchStart = () => {
  if (supportsTouch) return;
  supportsTouch = true;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) {
    window.addEventListener("touchstart", onTouchStart);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("touchstart", onTouchStart);
      supportsTouch = false;
    }
  };
};

const getSnapshot = () => supportsTouch;

const useSupportsTouch = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot);

export { useSupportsTouch };

import { useSyncExternalStore } from "react";

// All subscribers share one interval.
let currentTime = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const tick = () => {
  currentTime = Date.now();
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (timer === null) {
    // The cached time is stale after the timer stopped with the last
    // subscriber.
    currentTime = Date.now();
    timer = setInterval(tick, 30 * 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
};

const getSnapshot = () => currentTime;

const useNow = (): number => useSyncExternalStore(subscribe, getSnapshot);

export { useNow };

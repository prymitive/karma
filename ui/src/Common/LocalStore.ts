import { observable, autorun, set, toJS } from "mobx";

interface LocalStoreResult<T> {
  value: T;
  destroy: () => void;
}

function localStored<T extends object>(
  key: string,
  defaultValue: T,
): LocalStoreResult<T> {
  const initial: T = { ...defaultValue };

  const fromStorage = localStorage.getItem(key);
  if (fromStorage) {
    try {
      Object.assign(initial, JSON.parse(fromStorage));
    } catch {
      // ignore malformed JSON, use defaults
    }
  }

  const obsVal = observable(initial);

  const disposeAutorun = autorun(
    () => {
      localStorage.setItem(key, JSON.stringify(toJS(obsVal)));
    },
    { delay: 0 },
  );

  const onStorageEvent = (e: StorageEvent) => {
    if (e.key === key && e.newValue) {
      try {
        set(obsVal, JSON.parse(e.newValue));
      } catch {
        // ignore malformed JSON from other tabs
      }
    }
  };
  window.addEventListener("storage", onStorageEvent);

  return {
    value: obsVal,
    destroy() {
      disposeAutorun();
      window.removeEventListener("storage", onStorageEvent);
    },
  };
}

export { localStored };
export type { LocalStoreResult };

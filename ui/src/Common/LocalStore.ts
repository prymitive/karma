import { observable, autorun, remove, set, toJS, runInAction } from "mobx";

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
    if (e.key !== key) return;
    if (e.newValue === null) {
      runInAction(() => {
        for (const storedKey of Object.keys(obsVal)) {
          remove(obsVal, storedKey);
        }
        set(obsVal, defaultValue);
      });
      return;
    }
    const newValue = e.newValue;
    try {
      runInAction(() => set(obsVal, JSON.parse(newValue)));
    } catch {
      // ignore malformed JSON from other tabs
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

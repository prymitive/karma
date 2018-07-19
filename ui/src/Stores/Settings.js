import { action } from "mobx";
import { localStored } from "mobx-stored";

const defaultSavedFilters = {
  filters: [],
  present: false
};

const defaultFetchConfig = {
  interval: 30
};

class Settings {
  savedFilters = localStored("savedFilters", defaultSavedFilters, {
    delay: 100
  });

  saveFilters = action(newFilters => {
    this.savedFilters.filters = newFilters;
    this.savedFilters.present = true;
  });

  clearSavedFilters = action(() => {
    this.savedFilters.filters = [];
    this.savedFilters.present = false;
  });

  fetchConfig = localStored("fetchConfig", defaultFetchConfig, { delay: 100 });

  setFetchInterval = action(newInterval => {
    this.fetchConfig.interval = newInterval;
  });
}

export { Settings };

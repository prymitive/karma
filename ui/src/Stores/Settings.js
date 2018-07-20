import { action } from "mobx";
import { localStored } from "mobx-stored";

class SavedFilters {
  config = localStored(
    "savedFilters",
    {
      filters: [],
      present: false
    },
    {
      delay: 100
    }
  );

  save = action(newFilters => {
    this.config.filters = newFilters;
    this.config.present = true;
  });

  clear = action(() => {
    this.config.filters = [];
    this.config.present = false;
  });
}

class FetchConfig {
  config = localStored("fetchConfig", { interval: 30 }, { delay: 100 });

  setInterval = action(newInterval => {
    this.config.interval = newInterval;
  });
}

class Settings {
  constructor() {
    this.savedFilters = new SavedFilters();
    this.fetchConfig = new FetchConfig();
  }
}

export { Settings };

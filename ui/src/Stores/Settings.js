import { localStored } from "mobx-stored";

import { action } from "mobx";

const defaultSavedFilters = {
  filters: [],
  present: false
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
}

export { Settings };

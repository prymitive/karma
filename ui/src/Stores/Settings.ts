import { action } from "mobx";
import { localStored } from "mobx-stored";

import { UIDefaults } from "Models/UI";

interface SavedFilter {
  raw: string;
  name: string;
  matcher: string;
  value: string;
}

interface SavedFiltersStorage {
  filters: SavedFilter[];
  present: boolean;
}
class SavedFilters {
  config: SavedFiltersStorage = localStored(
    "savedFilters",
    {
      filters: [],
      present: false,
    },
    {
      delay: 100,
    }
  );

  save = action((newFilters: SavedFilter[]) => {
    this.config.filters = newFilters;
    this.config.present = true;
  });

  clear = action(() => {
    this.config.filters = [];
    this.config.present = false;
  });
}

interface FetchConfigStorage {
  interval: number;
}
class FetchConfig {
  config: FetchConfigStorage;
  setInterval: (newInterval: number) => void;

  constructor(refresh: number) {
    this.config = localStored(
      "fetchConfig",
      { interval: refresh },
      { delay: 100 }
    );

    this.setInterval = action((newInterval) => {
      this.config.interval = newInterval;
    });
  }
}

type collapseStateT = "expanded" | "collapsedOnMobile" | "collapsed";
interface AlertGroupConfigStorage {
  defaultRenderCount: number;
  collapseState: collapseStateT;
  colorTitleBar: boolean;
}
class AlertGroupConfig {
  options = Object.freeze({
    expanded: { label: "Always expanded", value: "expanded" },
    collapsedOnMobile: {
      label: "Collapse on mobile",
      value: "collapsedOnMobile",
    },
    collapsed: { label: "Always collapsed", value: "collapsed" },
  });

  config: AlertGroupConfigStorage;
  setDefaultRenderCount: (val: number) => void;

  constructor(
    renderCount: number,
    collapseState: collapseStateT,
    colorTitleBar: boolean
  ) {
    this.config = localStored(
      "alertGroupConfig",
      {
        defaultRenderCount: renderCount,
        defaultCollapseState: collapseState,
        colorTitleBar: colorTitleBar,
      },
      { delay: 100 }
    );

    this.setDefaultRenderCount = action((val: number) => {
      this.config.defaultRenderCount = val;
    });
  }
}

interface SilenceFormConfigStorage {
  author: string;
}
class SilenceFormConfig {
  config: SilenceFormConfigStorage = localStored(
    "silenceFormConfig",
    { author: "" },
    { delay: 100 }
  );

  saveAuthor = action((newAuthor: string) => {
    this.config.author = newAuthor;
  });
}

type sortOrderT = "default" | "disabled" | "startsAt" | "label";
interface GridConfigStorage {
  sortOrder: sortOrderT;
  sortLabel: string | null;
  reverseSort: boolean | null;
  groupWidth: number;
}
class GridConfig {
  options = Object.freeze({
    default: { label: "Use defaults from karma config file", value: "default" },
    disabled: { label: "No sorting", value: "disabled" },
    startsAt: { label: "Sort by alert timestamp", value: "startsAt" },
    label: { label: "Sort by alert label", value: "label" },
  });

  config: GridConfigStorage;
  constructor(groupWidth: number) {
    this.config = localStored(
      "alertGridConfig",
      {
        sortOrder: this.options.default.value,
        sortLabel: null,
        reverseSort: null,
        groupWidth: groupWidth,
      },
      { delay: 100 }
    );
  }
}

interface FilterBarConfigStorage {
  autohide: boolean;
}
class FilterBarConfig {
  config: FilterBarConfigStorage;
  constructor(autohide: boolean) {
    this.config = localStored(
      "filterBarConfig",
      {
        autohide: autohide,
      },
      {
        delay: 100,
      }
    );
  }
}

type themeT = "auto" | "light" | "dark";
interface ThemeConfigStorage {
  theme: themeT;
}
class ThemeConfig {
  options = Object.freeze({
    auto: {
      label: "Automatic theme, follow browser preference",
      value: "auto",
    },
    light: { label: "Light theme", value: "light" },
    dark: { label: "Dark theme", value: "dark" },
  });
  config: ThemeConfigStorage;
  constructor(defaultTheme: themeT) {
    this.config = localStored(
      "themeConfig",
      {
        theme: defaultTheme,
      },
      {
        delay: 100,
      }
    );
  }
}

interface MultiGridConfigStorage {
  gridLabel: string;
  gridSortReverse: boolean;
}
class MultiGridConfig {
  config: MultiGridConfigStorage;
  constructor(gridLabel: string, gridSortReverse: boolean) {
    this.config = localStored(
      "multiGridConfig",
      {
        gridLabel: gridLabel,
        gridSortReverse: gridSortReverse,
      },
      {
        delay: 100,
      }
    );
  }
}

class Settings {
  savedFilters: SavedFilters;
  fetchConfig: FetchConfig;
  alertGroupConfig: AlertGroupConfig;
  gridConfig: GridConfig;
  silenceFormConfig: SilenceFormConfig;
  filterBarConfig: FilterBarConfig;
  themeConfig: ThemeConfig;
  multiGridConfig: MultiGridConfig;

  constructor(defaults: UIDefaults | null | undefined) {
    let defaultSettings: UIDefaults;
    if (defaults === undefined || defaults === null) {
      defaultSettings = {
        Refresh: 30 * 1000 * 1000 * 1000,
        HideFiltersWhenIdle: true,
        ColorTitlebar: false,
        Theme: "auto",
        MinimalGroupWidth: 420,
        AlertsPerGroup: 5,
        CollapseGroups: "collapsedOnMobile",
        MultiGridLabel: "",
        MultiGridSortReverse: false,
      };
    } else {
      defaultSettings = defaults;
    }

    this.savedFilters = new SavedFilters();
    this.fetchConfig = new FetchConfig(
      defaultSettings.Refresh / 1000 / 1000 / 1000
    );
    this.alertGroupConfig = new AlertGroupConfig(
      defaultSettings.AlertsPerGroup,
      defaultSettings.CollapseGroups,
      defaultSettings.ColorTitlebar
    );
    this.gridConfig = new GridConfig(defaultSettings.MinimalGroupWidth);
    this.silenceFormConfig = new SilenceFormConfig();
    this.filterBarConfig = new FilterBarConfig(
      defaultSettings.HideFiltersWhenIdle
    );
    this.themeConfig = new ThemeConfig(defaultSettings.Theme);
    this.multiGridConfig = new MultiGridConfig(
      defaultSettings.MultiGridLabel,
      defaultSettings.MultiGridSortReverse
    );
  }
}

export { Settings };

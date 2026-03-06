import { action } from "mobx";

import { localStored } from "Common/LocalStore";

import type { UIDefaults } from "Models/UI";
import type { OptionT } from "Common/Select";

interface SavedFiltersStorage {
  filters: string[];
  present: boolean;
}
class SavedFilters {
  private store = localStored<SavedFiltersStorage>("savedFilters", {
    filters: [],
    present: false,
  });

  get config(): SavedFiltersStorage {
    return this.store.value;
  }

  save = action((newFilters: string[]) => {
    this.store.value.filters = newFilters;
    this.store.value.present = true;
  });

  clear = action(() => {
    this.store.value.filters = [];
    this.store.value.present = false;
  });
}

interface FetchConfigStorage {
  interval: number;
}
class FetchConfig {
  private store;
  config: FetchConfigStorage;
  setInterval: (newInterval: number) => void;

  constructor(refresh: number) {
    this.store = localStored<FetchConfigStorage>("fetchConfig", {
      interval: refresh,
    });
    this.config = this.store.value;

    this.setInterval = action((newInterval) => {
      this.config.interval = newInterval;
    });
  }
}

export type CollapseStateT = "expanded" | "collapsedOnMobile" | "collapsed";
interface AlertGroupConfigStorage {
  defaultRenderCount: number;
  defaultCollapseState: CollapseStateT;
  colorTitleBar: boolean;
}
class AlertGroupConfig {
  options = Object.freeze({
    expanded: {
      label: "Always expanded",
      value: "expanded",
      wasCreated: false,
    },
    collapsedOnMobile: {
      label: "Collapse on mobile",
      value: "collapsedOnMobile",
      wasCreated: false,
    },
    collapsed: {
      label: "Always collapsed",
      value: "collapsed",
      wasCreated: false,
    },
  });

  config: AlertGroupConfigStorage;
  setDefaultRenderCount: (val: number) => void;
  setDefaultCollapseState: (val: CollapseStateT) => void;
  setColorTitleBar: (val: boolean) => void;

  constructor(
    renderCount: number,
    collapseState: CollapseStateT,
    colorTitleBar: boolean,
  ) {
    const store = localStored<AlertGroupConfigStorage>("alertGroupConfig", {
      defaultRenderCount: renderCount,
      defaultCollapseState: collapseState,
      colorTitleBar: colorTitleBar,
    });
    this.config = store.value;

    this.setDefaultRenderCount = action((val: number) => {
      this.config.defaultRenderCount = val;
    });
    this.setDefaultCollapseState = action((val: CollapseStateT) => {
      this.config.defaultCollapseState = val;
    });
    this.setColorTitleBar = action((val: boolean) => {
      this.config.colorTitleBar = val;
    });
  }
}

interface SilenceFormConfigStorage {
  author: string;
}
class SilenceFormConfig {
  config: SilenceFormConfigStorage;
  saveAuthor: (newAuthor: string) => void;

  constructor() {
    const store = localStored<SilenceFormConfigStorage>("silenceFormConfig", {
      author: "",
    });
    this.config = store.value;

    this.saveAuthor = action((newAuthor: string) => {
      this.config.author = newAuthor;
    });
  }
}

export type SortOrderT = "default" | "disabled" | "startsAt" | "label";
interface GridConfigStorage {
  sortOrder: SortOrderT;
  sortLabel: string | null;
  reverseSort: boolean | null;
  groupWidth: number;
}
class GridConfig {
  options = Object.freeze({
    default: {
      label: "Use defaults from karma config file",
      value: "default",
      wasCreated: false,
    },
    disabled: { label: "No sorting", value: "disabled", wasCreated: false },
    startsAt: {
      label: "Sort by alert timestamp",
      value: "startsAt",
      wasCreated: false,
    },
    label: { label: "Sort by alert label", value: "label", wasCreated: false },
  });

  config: GridConfigStorage;
  setSortOrder: (o: SortOrderT) => void;
  setSortLabel: (l: string) => void;
  setSortReverse: (v: boolean | null) => void;
  setGroupWidth: (w: number) => void;

  constructor(groupWidth: number) {
    const store = localStored<GridConfigStorage>("alertGridConfig", {
      sortOrder: this.options.default.value as SortOrderT,
      sortLabel: null,
      reverseSort: null,
      groupWidth: groupWidth,
    });
    this.config = store.value;

    this.setSortOrder = action((o: SortOrderT) => {
      this.config.sortOrder = o;
    });
    this.setSortLabel = action((l: string) => {
      this.config.sortLabel = l;
    });
    this.setSortReverse = action((v: boolean | null) => {
      this.config.reverseSort = v;
    });
    this.setGroupWidth = action((w: number) => {
      this.config.groupWidth = w;
    });
  }
}

interface FilterBarConfigStorage {
  autohide: boolean;
}
class FilterBarConfig {
  config: FilterBarConfigStorage;
  setAutohide: (v: boolean) => void;

  constructor(autohide: boolean) {
    const store = localStored<FilterBarConfigStorage>("filterBarConfig", {
      autohide: autohide,
    });
    this.config = store.value;
    this.setAutohide = action((v: boolean) => {
      this.config.autohide = v;
    });
  }
}

export type ThemeT = "auto" | "light" | "dark";
interface ThemeConfigStorage {
  theme: ThemeT;
  animations: boolean;
}
class ThemeConfig {
  options: { [key: string]: OptionT };
  config: ThemeConfigStorage;
  setTheme: (v: ThemeT) => void;
  setAnimations: (v: boolean) => void;

  constructor(defaultTheme: ThemeT, animations: boolean) {
    this.options = Object.freeze({
      auto: {
        label: "Automatic theme, follow browser preference",
        value: "auto",
        wasCreated: false,
      },
      light: { label: "Light theme", value: "light", wasCreated: false },
      dark: { label: "Dark theme", value: "dark", wasCreated: false },
    });

    const store = localStored<ThemeConfigStorage>("themeConfig", {
      theme: defaultTheme,
      animations: animations,
    });
    this.config = store.value;
    this.setTheme = action((v: ThemeT) => {
      this.config.theme = v;
    });
    this.setAnimations = action((v: boolean) => {
      this.config.animations = v;
    });
  }
}

interface MultiGridConfigStorage {
  gridLabel: string;
  gridSortReverse: boolean;
}
class MultiGridConfig {
  config: MultiGridConfigStorage;
  setGridLabel: (l: string) => void;
  setGridSortReverse: (v: boolean) => void;

  constructor(gridLabel: string, gridSortReverse: boolean) {
    const store = localStored<MultiGridConfigStorage>("multiGridConfig", {
      gridLabel: gridLabel,
      gridSortReverse: gridSortReverse,
    });
    this.config = store.value;

    this.setGridLabel = action((l: string) => {
      this.config.gridLabel = l;
    });
    this.setGridSortReverse = action((v: boolean) => {
      this.config.gridSortReverse = v;
    });
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
        Animations: true,
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
      defaultSettings.Refresh / 1000 / 1000 / 1000,
    );
    this.alertGroupConfig = new AlertGroupConfig(
      defaultSettings.AlertsPerGroup,
      defaultSettings.CollapseGroups,
      defaultSettings.ColorTitlebar,
    );
    this.gridConfig = new GridConfig(defaultSettings.MinimalGroupWidth);
    this.silenceFormConfig = new SilenceFormConfig();
    this.filterBarConfig = new FilterBarConfig(
      defaultSettings.HideFiltersWhenIdle,
    );
    this.themeConfig = new ThemeConfig(
      defaultSettings.Theme,
      defaultSettings.Animations,
    );
    this.multiGridConfig = new MultiGridConfig(
      defaultSettings.MultiGridLabel,
      defaultSettings.MultiGridSortReverse,
    );
  }
}

export { Settings };

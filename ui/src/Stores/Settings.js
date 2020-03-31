import { action } from "mobx";
import { localStored } from "mobx-stored";

class SavedFilters {
  config = localStored(
    "savedFilters",
    {
      filters: [],
      present: false,
    },
    {
      delay: 100,
    }
  );

  save = action((newFilters) => {
    this.config.filters = newFilters;
    this.config.present = true;
  });

  clear = action(() => {
    this.config.filters = [];
    this.config.present = false;
  });
}

class FetchConfig {
  constructor(refresh) {
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

class AlertGroupConfig {
  options = Object.freeze({
    expanded: { label: "Always expanded", value: "expanded" },
    collapsedOnMobile: {
      label: "Collapse on mobile",
      value: "collapsedOnMobile",
    },
    collapsed: { label: "Always collapsed", value: "collapsed" },
  });

  constructor(renderCount, collapseState, colorTitleBar) {
    this.config = localStored(
      "alertGroupConfig",
      {
        defaultRenderCount: renderCount,
        defaultCollapseState: collapseState,
        colorTitleBar: colorTitleBar,
      },
      { delay: 100 }
    );
  }

  update = action((data) => {
    for (const [key, val] of Object.entries(data)) {
      this.config[key] = val;
    }
  });
}

class SilenceFormConfig {
  config = localStored("silenceFormConfig", { author: "" }, { delay: 100 });

  saveAuthor = action((newAuthor) => {
    this.config.author = newAuthor;
  });
}

class GridConfig {
  options = Object.freeze({
    default: { label: "Use defaults from karma config file", value: "default" },
    disabled: { label: "No sorting", value: "disabled" },
    startsAt: { label: "Sort by alert timestamp", value: "startsAt" },
    label: { label: "Sort by alert label", value: "label" },
  });
  constructor(groupWidth) {
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

class FilterBarConfig {
  constructor(autohide) {
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

class ThemeConfig {
  options = Object.freeze({
    auto: {
      label: "Automatic theme, follow browser preference",
      value: "auto",
    },
    light: { label: "Light theme", value: "light" },
    dark: { label: "Dark theme", value: "dark" },
  });
  constructor(defaultTheme) {
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

class MultiGridConfig {
  constructor(gridLabel, gridSortReverse) {
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
  constructor(defaults) {
    let defaultSettings;
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

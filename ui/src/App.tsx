import React, { Component } from "react";

import { observer } from "mobx-react";

import Media from "react-media";

import { AlertStore, DecodeLocationSearch } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";
import { BodyTheme, ThemeContext } from "Components/Theme";
import { ErrorBoundary } from "./ErrorBoundary";

import "Styles/ResetCSS.scss";
import "Styles/FontBundle.scss";
import "Styles/App.scss";

// https://github.com/facebook/react/issues/14603
const Grid = React.lazy(() =>
  import("Components/Grid").then((module) => ({
    default: module.Grid,
  }))
);
const NavBar = React.lazy(() =>
  import("Components/NavBar").then((module) => ({
    default: module.NavBar,
  }))
);
const Fetcher = React.lazy(() =>
  import("Components/Fetcher").then((module) => ({
    default: module.Fetcher,
  }))
);
const FaviconBadge = React.lazy(() =>
  import("Components/FaviconBadge").then((module) => ({
    default: module.FaviconBadge,
  }))
);

interface UIDefaults {
  Refresh: number;
  HideFiltersWhenIdle: boolean;
  ColorTitlebar: boolean;
  Theme: "light" | "dark" | "auto";
  MinimalGroupWidth: number;
  AlertsPerGroup: number;
  CollapseGroups: "expanded" | "collapsed" | "collapsedOnMobile";
}

interface AppProps {
  defaultFilters: Array<string>;
  uiDefaults: UIDefaults;
}

const App = observer(
  class App extends Component<AppProps, {}> {
    alertStore: AlertStore;
    silenceFormStore: SilenceFormStore;
    settingsStore: Settings;
    filters: Array<string> = [];

    constructor(props: AppProps) {
      super(props);

      const { defaultFilters, uiDefaults } = this.props;

      this.silenceFormStore = new SilenceFormStore();
      this.settingsStore = new Settings(uiDefaults);

      let filters;

      // parse and decode request query args
      const p = DecodeLocationSearch(window.location.search);

      // p.defaultsUsed means that karma URI didn't have ?q=foo query args
      if (p.defaultsUsed) {
        // no ?q=foo set, use defaults saved by the user or from backend config
        if (this.settingsStore.savedFilters.config.present) {
          filters = this.settingsStore.savedFilters.config.filters;
        } else {
          filters = defaultFilters;
        }
      } else {
        // user passed ?q=foo, use it as initial filters
        filters = p.params.q;
      }

      this.alertStore = new AlertStore(filters);
    }

    onPopState = (event: PopStateEvent) => {
      event.preventDefault();
      const p = DecodeLocationSearch(window.location.search);
      this.alertStore.filters.setWithoutLocation(p.params.q);
    };

    componentDidMount() {
      window.onpopstate = this.onPopState;
    }

    componentWillUnmount() {
      window.onpopstate = () => {};
    }

    render() {
      return (
        <ErrorBoundary>
          <span data-theme={`${this.settingsStore.themeConfig.config.theme}`} />
          <Media
            queries={{
              isSupported: "(prefers-color-scheme)",
              light: "(prefers-color-scheme: light)",
              dark: "(prefers-color-scheme: dark)",
            }}
          >
            {(matches) => (
              <ThemeContext.Provider
                value={{
                  isDark:
                    this.settingsStore.themeConfig.config.theme ===
                      this.settingsStore.themeConfig.options.auto.value &&
                    matches.isSupported
                      ? matches.dark
                      : this.settingsStore.themeConfig.config.theme ===
                        this.settingsStore.themeConfig.options.dark.value,
                  reactSelectStyles:
                    this.settingsStore.themeConfig.config.theme ===
                      this.settingsStore.themeConfig.options.auto.value &&
                    matches.isSupported
                      ? matches.dark
                        ? ReactSelectStyles(ReactSelectColors.Dark)
                        : ReactSelectStyles(ReactSelectColors.Light)
                      : this.settingsStore.themeConfig.config.theme ===
                        this.settingsStore.themeConfig.options.dark.value
                      ? ReactSelectStyles(ReactSelectColors.Dark)
                      : ReactSelectStyles(ReactSelectColors.Light),
                }}
              >
                <BodyTheme />
                <React.Suspense fallback={null}>
                  <NavBar
                    alertStore={this.alertStore}
                    settingsStore={this.settingsStore}
                    silenceFormStore={this.silenceFormStore}
                  />
                  <Grid
                    alertStore={this.alertStore}
                    settingsStore={this.settingsStore}
                    silenceFormStore={this.silenceFormStore}
                  />
                </React.Suspense>
              </ThemeContext.Provider>
            )}
          </Media>
          <React.Suspense fallback={null}>
            <FaviconBadge alertStore={this.alertStore} />
            <Fetcher
              alertStore={this.alertStore}
              settingsStore={this.settingsStore}
            />
          </React.Suspense>
        </ErrorBoundary>
      );
    }
  }
);

export { App };

import React, { Component } from "react";

import { observer } from "mobx-react";

import { AlertStore, DecodeLocationSearch } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Fetcher } from "Components/Fetcher";
import { FaviconBadge } from "Components/FaviconBadge";
import {
  ReactSelectColors,
  ReactSelectStyles
} from "Components/Theme/ReactSelect";
import { Theme, ThemeContext } from "Components/Theme";
import { ErrorBoundary } from "./ErrorBoundary";

import "Styles/ResetCSS.scss";
import "Styles/App.scss";

// https://github.com/facebook/react/issues/14603
const Grid = React.lazy(() =>
  import("Components/Grid").then(module => ({
    default: module.Grid
  }))
);
const NavBar = React.lazy(() =>
  import("Components/NavBar").then(module => ({
    default: module.NavBar
  }))
);

interface UIDefaults {
  Refresh: number;
  HideFiltersWhenIdle: boolean;
  ColorTitlebar: boolean;
  DarkTheme: boolean;
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

      this.state = { darkTheme: false };

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

      document.body.classList.toggle(
        "theme-dark",
        this.settingsStore.themeConfig.config.darkTheme
      );
      document.body.classList.toggle(
        "theme-light",
        !this.settingsStore.themeConfig.config.darkTheme
      );
    }

    componentWillUnmount() {
      window.onpopstate = () => {};
    }

    render() {
      return (
        <ErrorBoundary>
          <Theme settingsStore={this.settingsStore} />
          <ThemeContext.Provider
            value={{
              reactSelectStyles: this.settingsStore.themeConfig.config.darkTheme
                ? ReactSelectStyles(ReactSelectColors.Dark)
                : ReactSelectStyles(ReactSelectColors.Light)
            }}
          >
            <React.Suspense fallback={null}>
              <NavBar
                alertStore={this.alertStore}
                settingsStore={this.settingsStore}
                silenceFormStore={this.silenceFormStore}
              />
            </React.Suspense>
            <React.Suspense fallback={null}>
              <Grid
                alertStore={this.alertStore}
                settingsStore={this.settingsStore}
                silenceFormStore={this.silenceFormStore}
              />
            </React.Suspense>
          </ThemeContext.Provider>
          <FaviconBadge alertStore={this.alertStore} />
          <Fetcher
            alertStore={this.alertStore}
            settingsStore={this.settingsStore}
          />
        </ErrorBoundary>
      );
    }
  }
);

export { App };

import React, {
  FunctionComponent,
  useState,
  useEffect,
  useCallback,
} from "react";

import { useObserver } from "mobx-react-lite";

// no types, see react-app-env.d.ts
import { useMediaPredicate } from "react-media-hook";

import { AlertStore, DecodeLocationSearch } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";
import { BodyTheme, ThemeContext } from "Components/Theme";
import { UIDefaults } from "./AppBoot";
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

interface AppProps {
  defaultFilters: Array<string>;
  uiDefaults: UIDefaults | null;
}

const App: FunctionComponent<AppProps> = ({ defaultFilters, uiDefaults }) => {
  const [alertStore] = useState(new AlertStore(null));
  const [silenceFormStore] = useState(new SilenceFormStore());
  const [settingsStore] = useState(new Settings(uiDefaults));

  useEffect(() => {
    let filters;
    // parse and decode request query args
    const p: {
      params: {
        q: string[];
        m?: string;
      };
      defaultsUsed: boolean;
    } = DecodeLocationSearch(window.location.search);
    // p.defaultsUsed means that karma URI didn't have ?q=foo query args
    if (p.defaultsUsed) {
      // no ?q=foo set, use defaults saved by the user or from backend config
      if (settingsStore.savedFilters.config.present) {
        filters = settingsStore.savedFilters.config.filters;
      } else {
        filters = defaultFilters;
      }
    } else {
      // user passed ?q=foo, use it as initial filters
      filters = p.params.q;
    }
    alertStore.filters.setFilters(filters);

    if (p.params.m && silenceFormStore.data.fromBase64(p.params.m)) {
      silenceFormStore.toggle.show();
    }
  }, [alertStore, defaultFilters, settingsStore]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPopState = useCallback(
    (event: PopStateEvent) => {
      event.preventDefault();
      const p = DecodeLocationSearch(window.location.search);
      alertStore.filters.setWithoutLocation(p.params.q);
    },
    [alertStore]
  );

  useEffect(() => {
    window.onpopstate = onPopState;
    return () => {
      window.onpopstate = () => {};
    };
  }, [onPopState]);

  const prefersColorScheme = useMediaPredicate("(prefers-color-scheme)");
  const prefersDark = useMediaPredicate("(prefers-color-scheme: dark)");

  return useObserver(() => (
    <ErrorBoundary>
      <span data-theme={`${settingsStore.themeConfig.config.theme}`} />
      <ThemeContext.Provider
        value={{
          isDark:
            settingsStore.themeConfig.config.theme ===
              settingsStore.themeConfig.options.auto.value && prefersColorScheme
              ? prefersDark
              : settingsStore.themeConfig.config.theme ===
                settingsStore.themeConfig.options.dark.value,
          reactSelectStyles:
            settingsStore.themeConfig.config.theme ===
              settingsStore.themeConfig.options.auto.value && prefersColorScheme
              ? prefersDark
                ? ReactSelectStyles(ReactSelectColors.Dark)
                : ReactSelectStyles(ReactSelectColors.Light)
              : settingsStore.themeConfig.config.theme ===
                settingsStore.themeConfig.options.dark.value
              ? ReactSelectStyles(ReactSelectColors.Dark)
              : ReactSelectStyles(ReactSelectColors.Light),
          animations: {
            duration: 500,
          },
        }}
      >
        <BodyTheme />
        <React.Suspense fallback={null}>
          <NavBar
            alertStore={alertStore}
            settingsStore={settingsStore}
            silenceFormStore={silenceFormStore}
          />
          <Grid
            alertStore={alertStore}
            settingsStore={settingsStore}
            silenceFormStore={silenceFormStore}
          />
        </React.Suspense>
      </ThemeContext.Provider>
      <React.Suspense fallback={null}>
        <FaviconBadge alertStore={alertStore} />
        <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
      </React.Suspense>
    </ErrorBoundary>
  ));
};

export { App };

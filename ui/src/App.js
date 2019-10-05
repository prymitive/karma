import React, { Component } from "react";
import PropTypes from "prop-types";

import { Provider } from "mobx-react";

import { AlertStore, DecodeLocationSearch } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { NavBar } from "Components/NavBar";
import { Grid } from "Components/Grid";
import { Fetcher } from "Components/Fetcher";
import { FaviconBadge } from "Components/FaviconBadge";
import { ErrorBoundary } from "./ErrorBoundary";

import "./App.scss";

class App extends Component {
  static propTypes = {
    defaultFilters: PropTypes.arrayOf(PropTypes.string).isRequired,
    uiDefaults: PropTypes.exact({
      Refresh: PropTypes.number.isRequired,
      HideFiltersWhenIdle: PropTypes.bool.isRequired,
      ColorTitlebar: PropTypes.bool.isRequired,
      MinimalGroupWidth: PropTypes.number.isRequired,
      AlertsPerGroup: PropTypes.number.isRequired,
      CollapseGroups: PropTypes.oneOf([
        "expanded",
        "collapsed",
        "collapsedOnMobile"
      ]).isRequired
    })
  };

  constructor(props) {
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

  render() {
    return (
      <ErrorBoundary>
        <FaviconBadge alertStore={this.alertStore} />
        <NavBar
          alertStore={this.alertStore}
          settingsStore={this.settingsStore}
          silenceFormStore={this.silenceFormStore}
        />
        <Provider alertStore={this.alertStore}>
          <Grid
            alertStore={this.alertStore}
            settingsStore={this.settingsStore}
            silenceFormStore={this.silenceFormStore}
          />
        </Provider>
        <Fetcher
          alertStore={this.alertStore}
          settingsStore={this.settingsStore}
        />
      </ErrorBoundary>
    );
  }
}

export { App };

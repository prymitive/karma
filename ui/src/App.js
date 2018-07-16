import React, { Component } from "react";
import PropTypes from "prop-types";

import { Provider } from "mobx-react";

import { AlertStore, DecodeLocationSearch } from "Stores/AlertStore";
import { NavBar } from "Components/NavBar";
import { Grid } from "Components/Grid";
import { Fetcher } from "Components/Fetcher";

import "./App.css";

class App extends Component {
  static propTypes = {
    defaultFilters: PropTypes.arrayOf(PropTypes.string).isRequired
  };

  constructor(props) {
    super(props);

    const { defaultFilters } = this.props;

    let filters;

    // parse and decode request query args
    const p = DecodeLocationSearch();

    // p.defaultsUsed means that unsee URI didn't have ?q=foo query args
    if (p.defaultsUsed) {
      // no ?q=foo set, use defaults from backend config
      filters = defaultFilters;
    } else {
      // user passed ?q=foo, use it as initial filters
      filters = p.params.q;
    }

    this.alertStore = new AlertStore(filters);
  }

  render() {
    return (
      <React.Fragment>
        <NavBar alertStore={this.alertStore} />
        <Provider alertStore={this.alertStore}>
          <Grid alertStore={this.alertStore} />
        </Provider>
        <Fetcher alertStore={this.alertStore} />
      </React.Fragment>
    );
  }
}

export { App };

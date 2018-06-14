import React, { Component } from "react";

import { Provider } from "mobx-react";

import { AlertStore, DecodeLocationSearch } from "Stores/AlertStore";
import { NavBar } from "Components/NavBar";
import { Grid } from "Components/Grid";
import { Fetcher } from "Components/Fetcher";

import "./App.css";

class App extends Component {
  constructor(props) {
    super(props);

    const params = DecodeLocationSearch();

    this.alertStore = new AlertStore(params.q);
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

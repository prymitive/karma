import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import ReactResizeDetector from "react-resize-detector";

import { AlertStore } from "Stores/AlertStore";
import { FetchIndicator } from "./FetchIndicator";
import { FilterInput } from "./FilterInput";
import { MainModal } from "Components/MainModal";

import "./index.css";

const navbarResize = function(width, height) {
  document.body.style["padding-top"] = height + 4 + "px";
};

const NavBar = observer(
  class NavBar extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired
    };

    render() {
      const { alertStore } = this.props;
      return (
        <div className="container">
          <nav className="navbar fixed-top navbar-expand navbar-dark p-1 bg-primary-transparent">
            <ReactResizeDetector handleHeight onResize={navbarResize} />
            <span className="navbar-brand my-0 mx-2 h1 d-none d-sm-block">
              {alertStore.info.totalAlerts}
              <FetchIndicator status={alertStore.status.value.toString()} />
            </span>
            <FilterInput alertStore={alertStore} />
            <MainModal />
          </nav>
        </div>
      );
    }
  }
);

export { NavBar };

import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import ReactResizeDetector from "react-resize-detector";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";

import { AlertStore } from "Stores/AlertStore";
import { FetchIndicator } from "./FetchIndicator";
import { FilterInput } from "./FilterInput";

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
            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle mx-1"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="true"
                >
                  <FontAwesomeIcon icon={faCog} />
                </a>
              </li>
            </ul>
          </nav>
        </div>
      );
    }
  }
);

export { NavBar };

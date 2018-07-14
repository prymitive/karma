import React, { Component } from "react";

import { observer } from "mobx-react";
import { observable, action } from "mobx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";

import { Help } from "./Help";

const MainModal = observer(
  class MainModal extends Component {
    toggle = observable(
      {
        show: false,
        toggle() {
          this.show = !this.show;
        },
        hide() {
          this.show = false;
        }
      },
      { toggle: action.bound, hide: action.bound }
    );

    componentDidUpdate() {
      document.body.classList.toggle("modal-open", this.toggle.show);
    }

    componentWillUnmount() {
      document.body.classList.remove("modal-open");
    }

    render() {
      return (
        <React.Fragment>
          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a
                className="nav-link mx-1 cursor-pointer"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="true"
                onClick={this.toggle.toggle}
              >
                <FontAwesomeIcon icon={faCog} />
              </a>
            </li>
          </ul>
          {this.toggle.show ? (
            <div
              className="modal d-block bg-primary-transparent-80"
              tabIndex="-1"
              role="dialog"
            >
              <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Help</h5>
                    <button
                      type="button"
                      className="close"
                      data-dismiss="modal"
                      aria-label="Close"
                      onClick={this.toggle.hide}
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <Help />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </React.Fragment>
      );
    }
  }
);

export { MainModal };

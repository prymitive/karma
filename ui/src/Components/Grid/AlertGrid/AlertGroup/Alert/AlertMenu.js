import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import hash from "object-hash";

import { Manager, Reference, Popper } from "react-popper";
import onClickOutside from "react-onclickoutside";

import Moment from "react-moment";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APIAlert, APIGroup } from "Models/API";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FetchPauser } from "Components/FetchPauser";
import { DropdownSlide } from "Components/Animations/DropdownSlide";

const onSilenceClick = (silenceFormStore, group, alert) => {
  silenceFormStore.data.resetProgress();
  silenceFormStore.data.fillMatchersFromGroup(group, [alert]);
  silenceFormStore.toggle.show();
};

const MenuContent = onClickOutside(
  ({
    popperPlacement,
    popperRef,
    popperStyle,
    group,
    alert,
    afterClick,
    silenceFormStore
  }) => {
    return (
      <FetchPauser>
        <div
          className="dropdown-menu d-block"
          ref={popperRef}
          style={popperStyle}
          data-placement={popperPlacement}
        >
          <h6 className="dropdown-header">Alert source links:</h6>
          {alert.alertmanager.map(am => (
            <a
              key={am.name}
              className="dropdown-item"
              href={am.source}
              target="_blank"
              rel="noopener noreferrer"
              onClick={afterClick}
            >
              {am.name}
            </a>
          ))}
          <div className="dropdown-divider" />
          <div
            className="dropdown-item cursor-pointer"
            onClick={() => onSilenceClick(silenceFormStore, group, alert)}
          >
            <FontAwesomeIcon icon={faBellSlash} /> Silence this alert
          </div>
        </div>
      </FetchPauser>
    );
  }
);
MenuContent.propTypes = {
  popperPlacement: PropTypes.string,
  popperRef: PropTypes.func,
  popperStyle: PropTypes.object,
  group: APIGroup.isRequired,
  alert: APIAlert.isRequired,
  afterClick: PropTypes.func.isRequired
};

const AlertMenu = observer(
  class AlertMenu extends Component {
    static propTypes = {
      group: APIGroup.isRequired,
      alert: APIAlert.isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    collapse = observable(
      {
        value: true,
        toggle() {
          this.value = !this.value;
        },
        hide() {
          this.value = true;
        }
      },
      { toggle: action.bound, hide: action.bound },
      { name: "Alert menu toggle" }
    );

    handleClickOutside = action(event => {
      this.collapse.hide();
    });

    render() {
      const { group, alert, silenceFormStore } = this.props;

      const uniqueClass = `components-grid-alert-${group.id}-${hash(
        alert.labels
      )}`;

      return (
        <Manager>
          <Reference>
            {({ ref }) => (
              <span
                className={`components-label-with-hover text-nowrap text-truncate px-1 mr-1 badge badge-secondary cursor-pointer ${uniqueClass}`}
                ref={ref}
                onClick={this.collapse.toggle}
                data-toggle="dropdown"
              >
                <FontAwesomeIcon
                  className="pr-1"
                  style={{ width: "0.8rem" }}
                  icon={faCaretDown}
                />
                <Moment fromNow>{alert.startsAt}</Moment>
              </span>
            )}
          </Reference>
          <DropdownSlide in={!this.collapse.value} unmountOnExit>
            <Popper
              placement="bottom-start"
              modifiers={{
                arrow: { enabled: false },
                offset: { offset: "-5px, 0px" }
              }}
            >
              {({ placement, ref, style }) => (
                <MenuContent
                  popperPlacement={placement}
                  popperRef={ref}
                  popperStyle={style}
                  group={group}
                  alert={alert}
                  silenceFormStore={silenceFormStore}
                  afterClick={this.collapse.hide}
                  handleClickOutside={this.collapse.hide}
                  outsideClickIgnoreClass={uniqueClass}
                />
              )}
            </Popper>
          </DropdownSlide>
        </Manager>
      );
    }
  }
);

export { AlertMenu, MenuContent };

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
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";

import { APIAlert, APIGroup } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceTabNames } from "Stores/SilenceFormStore";
import { FetchPauser } from "Components/FetchPauser";
import { DropdownSlide } from "Components/Animations/DropdownSlide";

const onSilenceClick = (alertStore, silenceFormStore, group, alert) => {
  silenceFormStore.data.resetProgress();
  silenceFormStore.data.fillMatchersFromGroup(
    group,
    alertStore.settings.values.silenceForm.strip.labels,
    [alert]
  );
  silenceFormStore.tab.setTab(SilenceTabNames.Editor);
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
    alertStore,
    silenceFormStore,
  }) => {
    const isReadOnly =
      Object.keys(alertStore.data.clustersWithoutReadOnly).length === 0;

    return (
      <FetchPauser alertStore={alertStore}>
        <div
          className="dropdown-menu d-block shadow"
          ref={popperRef}
          style={popperStyle}
          data-placement={popperPlacement}
        >
          <h6 className="dropdown-header">Alert source links:</h6>
          {alert.alertmanager.map((am) => (
            <a
              key={am.name}
              className="dropdown-item"
              href={am.source}
              target="_blank"
              rel="noopener noreferrer"
              onClick={afterClick}
            >
              <FontAwesomeIcon className="mr-1" icon={faExternalLinkAlt} />
              {am.name}
            </a>
          ))}
          <div className="dropdown-divider" />
          <div
            className={`dropdown-item cursor-pointer ${
              isReadOnly && "disabled"
            }`}
            onClick={() =>
              isReadOnly ||
              onSilenceClick(alertStore, silenceFormStore, group, alert)
            }
          >
            <FontAwesomeIcon className="mr-1" icon={faBellSlash} />
            Silence this alert
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
  afterClick: PropTypes.func.isRequired,
};

const AlertMenu = observer(
  class AlertMenu extends Component {
    static propTypes = {
      group: APIGroup.isRequired,
      alert: APIAlert.isRequired,
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      setIsMenuOpen: PropTypes.func.isRequired,
    };

    constructor(props) {
      super(props);

      this.collapse = observable(
        {
          value: true,
          toggle() {
            this.value = !this.value;
            props.setIsMenuOpen(!this.value);
          },
          hide() {
            this.value = true;
            props.setIsMenuOpen(!this.value);
          },
        },
        { toggle: action.bound, hide: action.bound },
        { name: "Alert menu toggle" }
      );
    }

    handleClickOutside = action((event) => {
      this.collapse.hide();
    });

    render() {
      const { group, alert, alertStore, silenceFormStore } = this.props;

      const uniqueClass = `components-grid-alert-${group.id}-${hash(
        alert.labels
      )}`;

      return (
        <Manager>
          <Reference>
            {({ ref }) => (
              <span
                className={`components-label components-label-with-hover px-1 mr-1 badge badge-secondary cursor-pointer ${uniqueClass}`}
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
              modifiers={[
                { name: "arrow", enabled: false },
                { name: "offset", options: { offset: "-5px, 0px" } },
              ]}
            >
              {({ placement, ref, style }) => (
                <MenuContent
                  popperPlacement={placement}
                  popperRef={ref}
                  popperStyle={style}
                  group={group}
                  alert={alert}
                  alertStore={alertStore}
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

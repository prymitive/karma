import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import copy from "copy-to-clipboard";

import { Manager, Reference, Popper } from "react-popper";
import onClickOutside from "react-onclickoutside";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
import { faShareSquare } from "@fortawesome/free-solid-svg-icons/faShareSquare";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APIGroup } from "Models/API";
import { FormatAlertsQ } from "Stores/AlertStore";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceTabNames } from "Stores/SilenceFormStore";
import { QueryOperators, StaticLabels, FormatQuery } from "Common/Query";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { FetchPauser } from "Components/FetchPauser";

const onSilenceClick = (alertStore, silenceFormStore, group) => {
  silenceFormStore.data.resetProgress();
  silenceFormStore.data.fillMatchersFromGroup(
    group,
    alertStore.settings.values.silenceForm.strip.labels
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
    afterClick,
    alertStore,
    silenceFormStore,
  }) => {
    let groupFilters = Object.keys(group.labels).map((name) =>
      FormatQuery(name, QueryOperators.Equal, group.labels[name])
    );
    groupFilters.push(
      FormatQuery(StaticLabels.Receiver, QueryOperators.Equal, group.receiver)
    );
    const baseURL = [
      window.location.protocol,
      "//",
      window.location.host,
      window.location.pathname,
    ].join("");
    const groupLink = `${baseURL}?${FormatAlertsQ(groupFilters)}`;

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
          <div
            className="dropdown-item cursor-pointer"
            onClick={() => {
              copy(groupLink);
              afterClick();
            }}
          >
            <FontAwesomeIcon icon={faShareSquare} /> Copy link to this group
          </div>
          <div
            className={`dropdown-item cursor-pointer ${
              isReadOnly && "disabled"
            }`}
            onClick={() =>
              isReadOnly || onSilenceClick(alertStore, silenceFormStore, group)
            }
          >
            <FontAwesomeIcon icon={faBellSlash} /> Silence this group
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
  afterClick: PropTypes.func.isRequired,
};

const GroupMenu = observer(
  class GroupMenu extends Component {
    static propTypes = {
      group: APIGroup.isRequired,
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      themed: PropTypes.bool.isRequired,
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
        { name: "Alert group menu toggle" }
      );
    }

    handleClickOutside = action((event) => {
      this.collapse.hide();
    });

    render() {
      const { group, alertStore, silenceFormStore, themed } = this.props;

      return (
        <Manager>
          <Reference>
            {({ ref }) => (
              <span
                ref={ref}
                onClick={this.collapse.toggle}
                className={`${
                  themed ? "text-white" : "text-muted"
                } cursor-pointer badge pl-0 components-label mr-0 components-grid-alertgroup-${
                  group.id
                }`}
                data-toggle="dropdown"
              >
                <FontAwesomeIcon icon={faEllipsisV} />
              </span>
            )}
          </Reference>
          <DropdownSlide in={!this.collapse.value} unmountOnExit>
            <Popper
              placement="bottom-start"
              modifiers={{
                arrow: { enabled: false },
                offset: { offset: "-5px, 0px" },
              }}
            >
              {({ placement, ref, style }) => (
                <MenuContent
                  popperPlacement={placement}
                  popperRef={ref}
                  popperStyle={style}
                  group={group}
                  alertStore={alertStore}
                  silenceFormStore={silenceFormStore}
                  afterClick={this.collapse.hide}
                  handleClickOutside={this.collapse.hide}
                  outsideClickIgnoreClass={`components-grid-alertgroup-${group.id}`}
                />
              )}
            </Popper>
          </DropdownSlide>
        </Manager>
      );
    }
  }
);

export { GroupMenu, MenuContent };

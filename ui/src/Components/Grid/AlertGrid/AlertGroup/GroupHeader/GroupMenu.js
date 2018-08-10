import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import { Manager, Reference, Popper } from "react-popper";
import onClickOutside from "react-onclickoutside";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
import { faShareSquare } from "@fortawesome/free-solid-svg-icons/faShareSquare";

import { FormatAPIFilterQuery } from "Stores/AlertStore";
import { QueryOperators, StaticLabels, FormatQuery } from "Common/Query";

const MenuContent = onClickOutside(
  ({ popperPlacement, popperRef, popperStyle, group, afterClick }) => {
    let groupFilters = Object.keys(group.labels).map(name =>
      FormatQuery(name, QueryOperators.Equal, group.labels[name])
    );
    groupFilters.push(
      FormatQuery(StaticLabels.Receiver, QueryOperators.Equal, group.receiver)
    );
    const groupLink = `?${FormatAPIFilterQuery(groupFilters)}`;

    return (
      <div
        className="dropdown-menu d-block"
        ref={popperRef}
        style={popperStyle}
        data-placement={popperPlacement}
      >
        <a
          className="dropdown-item"
          href={groupLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon icon={faShareSquare} /> Link to this group
        </a>
      </div>
    );
  }
);
MenuContent.propTypes = {
  popperPlacement: PropTypes.string,
  popperRef: PropTypes.func,
  popperStyle: PropTypes.object,
  group: PropTypes.object.isRequired,
  afterClick: PropTypes.func.isRequired
};

const GroupMenu = observer(
  class GroupMenu extends Component {
    static propTypes = {
      group: PropTypes.object.isRequired
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
      { name: "Alert group menu toggle" }
    );

    handleClickOutside = action(event => {
      this.collapse.hide();
    });

    render() {
      const { group } = this.props;

      return (
        <Manager>
          <Reference>
            {({ ref }) => (
              <a
                ref={ref}
                onClick={this.collapse.toggle}
                className={`text-muted cursor-pointer badge text-nowrap text-truncate pl-0 components-grid-alertgroup-${
                  group.id
                }`}
                data-toggle="dropdown"
              >
                <FontAwesomeIcon icon={faEllipsisV} />
              </a>
            )}
          </Reference>
          {this.collapse.value ? null : (
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
                  afterClick={this.collapse.hide}
                  handleClickOutside={this.collapse.hide}
                  outsideClickIgnoreClass={`components-grid-alertgroup-${
                    group.id
                  }`}
                />
              )}
            </Popper>
          )}
        </Manager>
      );
    }
  }
);

export { GroupMenu };

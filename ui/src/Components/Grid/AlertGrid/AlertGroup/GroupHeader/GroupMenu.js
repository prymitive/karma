import React, { useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";

import copy from "copy-to-clipboard";

import { Manager, Reference, Popper } from "react-popper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
import { faShareSquare } from "@fortawesome/free-solid-svg-icons/faShareSquare";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";

import { APIGroup } from "Models/API";
import { FormatAlertsQ } from "Stores/AlertStore";
import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  SilenceTabNames,
  AlertmanagerClustersToOption,
} from "Stores/SilenceFormStore";
import { QueryOperators, StaticLabels, FormatQuery } from "Common/Query";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { FetchPauser } from "Components/FetchPauser";
import { useOnClickOutside } from "Hooks/useOnClickOutside";

const onSilenceClick = (alertStore, silenceFormStore, group) => {
  let clusters = {};
  Object.entries(alertStore.data.clustersWithoutReadOnly).forEach(
    ([cluster, members]) => {
      members.forEach((member) => {
        if (Object.keys(group.alertmanagerCount).includes(member)) {
          clusters[cluster] = members;
        }
      });
    }
  );

  silenceFormStore.data.resetProgress();
  silenceFormStore.data.fillMatchersFromGroup(
    group,
    alertStore.settings.values.silenceForm.strip.labels,
    AlertmanagerClustersToOption(clusters)
  );
  silenceFormStore.tab.setTab(SilenceTabNames.Editor);
  silenceFormStore.toggle.show();
};

const MenuContent = ({
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
          className={`dropdown-item ${
            Object.keys(alertStore.data.clustersWithoutReadOnly).length === 0
              ? "disabled"
              : "cursor-pointer"
          }`}
          onClick={() => {
            if (Object.keys(alertStore.data.clustersWithoutReadOnly).length) {
              onSilenceClick(alertStore, silenceFormStore, group);
              afterClick();
            }
          }}
        >
          <FontAwesomeIcon icon={faBellSlash} /> Silence this group
        </div>
      </div>
    </FetchPauser>
  );
};
MenuContent.propTypes = {
  popperPlacement: PropTypes.string,
  popperRef: PropTypes.func,
  popperStyle: PropTypes.object,
  group: APIGroup.isRequired,
  afterClick: PropTypes.func.isRequired,
};

const GroupMenu = ({
  group,
  alertStore,
  silenceFormStore,
  themed,
  setIsMenuOpen,
}) => {
  const [isHidden, setIsHidden] = useState(true);

  const toggle = useCallback(() => {
    setIsMenuOpen(isHidden);
    setIsHidden(!isHidden);
  }, [isHidden, setIsMenuOpen]);

  const hide = useCallback(() => {
    setIsHidden(true);
    setIsMenuOpen(false);
  }, [setIsMenuOpen]);

  const rootRef = useRef(null);
  useOnClickOutside(rootRef, hide, !isHidden);

  return (
    <span ref={rootRef}>
      <Manager>
        <Reference>
          {({ ref }) => (
            <span
              ref={ref}
              onClick={toggle}
              className={`${
                themed ? "text-white" : "text-muted"
              } cursor-pointer badge pl-0 pr-3 pr-sm-2 components-label mr-0`}
              data-toggle="dropdown"
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </span>
          )}
        </Reference>
        <DropdownSlide in={!isHidden} unmountOnExit>
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
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
                afterClick={hide}
              />
            )}
          </Popper>
        </DropdownSlide>
      </Manager>
    </span>
  );
};
GroupMenu.propTypes = {
  group: APIGroup.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  themed: PropTypes.bool.isRequired,
  setIsMenuOpen: PropTypes.func.isRequired,
};

export { GroupMenu, MenuContent };

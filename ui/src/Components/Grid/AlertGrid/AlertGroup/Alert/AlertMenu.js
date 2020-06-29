import React, { useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { Manager, Reference, Popper } from "react-popper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";

import { APIAlert, APIGroup } from "Models/API";
import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  SilenceTabNames,
  AlertmanagerClustersToOption,
} from "Stores/SilenceFormStore";
import { FetchPauser } from "Components/FetchPauser";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { DateFromNow } from "Components/DateFromNow";
import { useOnClickOutside } from "Hooks/useOnClickOutside";

const onSilenceClick = (alertStore, silenceFormStore, group, alert) => {
  let clusters = {};
  Object.entries(alertStore.data.clustersWithoutReadOnly).forEach(
    ([cluster, members]) => {
      if (alert.alertmanager.map((am) => am.cluster).includes(cluster)) {
        clusters[cluster] = members;
      }
    }
  );

  silenceFormStore.data.resetProgress();
  silenceFormStore.data.fillMatchersFromGroup(
    group,
    alertStore.settings.values.silenceForm.strip.labels,
    AlertmanagerClustersToOption(clusters),
    [alert]
  );
  silenceFormStore.tab.setTab(SilenceTabNames.Editor);
  silenceFormStore.toggle.show();
};

const MenuContent = ({
  popperPlacement,
  popperRef,
  popperStyle,
  group,
  alert,
  afterClick,
  alertStore,
  silenceFormStore,
}) => {
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
          className={`dropdown-item ${
            Object.keys(alertStore.data.clustersWithoutReadOnly).length === 0
              ? "disabled"
              : "cursor-pointer"
          }`}
          onClick={() => {
            if (Object.keys(alertStore.data.clustersWithoutReadOnly).length) {
              onSilenceClick(alertStore, silenceFormStore, group, alert);
              afterClick();
            }
          }}
        >
          <FontAwesomeIcon className="mr-1" icon={faBellSlash} />
          Silence this alert
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
  alert: APIAlert.isRequired,
  afterClick: PropTypes.func.isRequired,
};

const AlertMenu = ({
  group,
  alert,
  alertStore,
  silenceFormStore,
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

  return useObserver(() => (
    <span ref={rootRef}>
      <Manager>
        <Reference>
          {({ ref }) => (
            <span
              className="components-label components-label-with-hover px-1 mr-1 badge badge-secondary cursor-pointer"
              ref={ref}
              onClick={toggle}
              data-toggle="dropdown"
            >
              <FontAwesomeIcon
                className="pr-1"
                style={{ width: "0.8rem" }}
                icon={faCaretDown}
              />
              <DateFromNow timestamp={alert.startsAt} />
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
                alert={alert}
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
                afterClick={hide}
              />
            )}
          </Popper>
        </DropdownSlide>
      </Manager>
    </span>
  ));
};
AlertMenu.propTypes = {
  group: APIGroup.isRequired,
  alert: APIAlert.isRequired,
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  setIsMenuOpen: PropTypes.func.isRequired,
};

export { AlertMenu, MenuContent };

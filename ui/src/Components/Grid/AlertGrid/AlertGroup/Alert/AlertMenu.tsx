import React, {
  FC,
  Ref,
  CSSProperties,
  useRef,
  useState,
  useCallback,
} from "react";

import { useObserver } from "mobx-react-lite";

import { Manager, Reference, Popper } from "react-popper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";

import { APIAlertT, APIAlertGroupT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  AlertmanagerClustersToOption,
} from "Stores/SilenceFormStore";
import { CommonPopperModifiers } from "Common/Popper";
import { FetchPauser } from "Components/FetchPauser";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { DateFromNow } from "Components/DateFromNow";
import { useOnClickOutside } from "Hooks/useOnClickOutside";

const PopperModifiers = [
  ...CommonPopperModifiers,
  { name: "offset", options: { offset: "-5px, 0px" } },
];

const onSilenceClick = (
  alertStore: AlertStore,
  silenceFormStore: SilenceFormStore,
  group: APIAlertGroupT,
  alert: APIAlertT
) => {
  const clusters: { [cluster: string]: string[] } = {};
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
  silenceFormStore.tab.setTab("editor");
  silenceFormStore.toggle.show();
};

const MenuContent: FC<{
  popperPlacement?: string;
  popperRef?: Ref<HTMLDivElement>;
  popperStyle?: CSSProperties;
  group: APIAlertGroupT;
  alert: APIAlertT;
  afterClick: () => void;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
}> = ({
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

const AlertMenu: FC<{
  group: APIAlertGroupT;
  alert: APIAlertT;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  setIsMenuOpen: (isOpen: boolean) => void;
}> = ({ group, alert, alertStore, silenceFormStore, setIsMenuOpen }) => {
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
          <Popper placement="bottom-start" modifiers={PopperModifiers}>
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

export { AlertMenu, MenuContent };

import { FC, useRef, useState, useCallback, Ref, CSSProperties } from "react";

import copy from "copy-to-clipboard";

import { Manager, Reference, Popper } from "react-popper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faShareSquare } from "@fortawesome/free-solid-svg-icons/faShareSquare";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";
import { faWrench } from "@fortawesome/free-solid-svg-icons/faWrench";

import { APIAlertGroupT } from "Models/APITypes";
import { FormatAlertsQ } from "Stores/AlertStore";
import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  AlertmanagerClustersToOption,
} from "Stores/SilenceFormStore";
import { QueryOperators, StaticLabels, FormatQuery } from "Common/Query";
import { CommonPopperModifiers } from "Common/Popper";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { FetchPauser } from "Components/FetchPauser";
import { useOnClickOutside } from "Hooks/useOnClickOutside";
import { MenuLink } from "Components/Grid/AlertGrid/AlertGroup/MenuLink";

const PopperModifiers = [
  ...CommonPopperModifiers,
  { name: "offset", options: { offset: "-5px, 0px" } },
];

const onSilenceClick = (
  alertStore: AlertStore,
  silenceFormStore: SilenceFormStore,
  group: APIAlertGroupT
) => {
  const clusters: { [cluster: string]: string[] } = {};
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
  silenceFormStore.tab.setTab("editor");
  silenceFormStore.toggle.show();
};

const MenuContent: FC<{
  popperPlacement?: string;
  popperRef?: Ref<HTMLDivElement>;
  popperStyle?: CSSProperties;
  group: APIAlertGroupT;
  afterClick: () => void;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
}> = ({
  popperPlacement,
  popperRef,
  popperStyle,
  group,
  afterClick,
  alertStore,
  silenceFormStore,
}) => {
  const groupFilters = Object.keys(group.labels).map((name) =>
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

  const actions = group.shared.annotations
    .filter((a) => a.isLink === true)
    .filter((a) => a.isAction === true);

  return (
    <FetchPauser alertStore={alertStore}>
      <div
        className="dropdown-menu d-block shadow m-0"
        ref={popperRef}
        style={popperStyle}
        data-placement={popperPlacement}
      >
        {actions.length ? (
          <>
            <h6 className="dropdown-header">Actions:</h6>
            {actions.map((action) => (
              <MenuLink
                key={action.name}
                icon={faWrench}
                text={action.name}
                uri={action.value}
                afterClick={afterClick}
              />
            ))}
            <div className="dropdown-divider" />
          </>
        ) : null}
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

const GroupMenu: FC<{
  group: APIAlertGroupT;
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  themed: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}> = ({ group, alertStore, silenceFormStore, themed, setIsMenuOpen }) => {
  const [isHidden, setIsHidden] = useState<boolean>(true);

  const toggle = useCallback(() => {
    setIsMenuOpen(isHidden);
    setIsHidden(!isHidden);
  }, [isHidden, setIsMenuOpen]);

  const hide = useCallback(() => {
    setIsHidden(true);
    setIsMenuOpen(false);
  }, [setIsMenuOpen]);

  const rootRef = useRef<HTMLSpanElement | null>(null);
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
                themed ? "text-white with-click-light" : "text-muted"
              } cursor-pointer badge components-label components-label-with-hover with-click me-1`}
              data-toggle="dropdown"
            >
              <FontAwesomeIcon icon={faBars} />
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

export { GroupMenu, MenuContent };

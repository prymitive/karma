import { FC, Ref, CSSProperties, useRef, useState, useCallback } from "react";

import { observer } from "mobx-react-lite";

import { Manager, Reference, Popper } from "react-popper";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons/faBellSlash";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faWrench } from "@fortawesome/free-solid-svg-icons/faWrench";

import { APIAlertT, APIAlertGroupT, APIAnnotationT } from "Models/APITypes";
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
import { MenuLink } from "Components/Grid/AlertGrid/AlertGroup/MenuLink";

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
  const actions: APIAnnotationT[] = [
    ...alert.annotations
      .filter((a) => a.isLink === true)
      .filter((a) => a.isAction === true),
    ...group.shared.annotations
      .filter((a) => a.isLink === true)
      .filter((a) => a.isAction === true),
  ];

  return (
    <FetchPauser alertStore={alertStore}>
      <div
        className="dropdown-menu d-block shadow m-0"
        ref={popperRef}
        style={popperStyle}
        data-placement={popperPlacement}
      >
        <h6 className="dropdown-header">Alert source links:</h6>
        {alert.alertmanager.map((am) => (
          <MenuLink
            key={am.name}
            icon={faExternalLinkAlt}
            text={am.name}
            uri={am.source}
            afterClick={afterClick}
          />
        ))}
        {actions.length ? (
          <>
            <div className="dropdown-divider" />
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
          </>
        ) : null}
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
          <FontAwesomeIcon className="me-1" icon={faBellSlash} />
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
}> = observer(
  ({ group, alert, alertStore, silenceFormStore, setIsMenuOpen }) => {
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
                className="components-label components-label-with-hover px-1 me-1 badge bg-secondary cursor-pointer"
                ref={ref}
                onClick={toggle}
                data-toggle="dropdown"
              >
                <FontAwesomeIcon
                  className="pe-1"
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
    );
  }
);

export { AlertMenu, MenuContent };

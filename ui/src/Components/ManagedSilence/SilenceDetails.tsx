import { FC, useState } from "react";

import parseISO from "date-fns/parseISO";

import copy from "copy-to-clipboard";

import { CSSTransition } from "react-transition-group";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faCalendarCheck } from "@fortawesome/free-solid-svg-icons/faCalendarCheck";
import { faCalendarTimes } from "@fortawesome/free-solid-svg-icons/faCalendarTimes";
import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";
import { faHome } from "@fortawesome/free-solid-svg-icons/faHome";
import { faFingerprint } from "@fortawesome/free-solid-svg-icons/faFingerprint";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";

import { APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, MatcherToOperator } from "Stores/SilenceFormStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { RenderLinkAnnotation } from "Components/Grid/AlertGrid/AlertGroup/Annotation";
import { DateFromNow } from "Components/DateFromNow";
import { useFlashTransition } from "Hooks/useFlashTransition";
import { DeleteSilence } from "./DeleteSilence";

const SilenceIDCopyButton: FC<{
  id: string;
}> = ({ id }) => {
  const [clickCount, setClickCount] = useState<number>(0);
  const { ref, props } = useFlashTransition(clickCount);

  return (
    <TooltipWrapper title="Copy silence ID to the clipboard">
      <CSSTransition {...props}>
        <span
          ref={ref}
          className="badge bg-secondary px-1 me-1 components-label cursor-pointer"
          onClick={() => {
            copy(id);
            setClickCount(clickCount + 1);
          }}
        >
          <FontAwesomeIcon icon={faCopy} />
        </span>
      </CSSTransition>
    </TooltipWrapper>
  );
};

const SilenceDetails: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  silence: APISilenceT;
  cluster: string;
  onEditSilence: () => void;
  isUpper?: boolean;
}> = ({
  alertStore,
  silenceFormStore,
  silence,
  cluster,
  onEditSilence,
  isUpper = false,
}) => {
  const isExpired = parseISO(silence.endsAt) < new Date();
  let expiresClass = "";
  let expiresLabel = "Expires";
  if (isExpired) {
    expiresClass = "text-danger";
    expiresLabel = "Expired";
  }

  const alertmanagers = alertStore.data.upstreams.instances.filter(
    (u) => u.cluster === cluster
  );

  const isReadOnly =
    alertStore.data.getClusterAlertmanagersWithoutReadOnly(cluster).length ===
    0;

  return (
    <div className="mt-1">
      <div className="d-flex flex-fill flex-lg-row flex-column justify-content-between">
        <div className="flex-shrink-1 flex-grow-1 mw-1p">
          <div>
            <span className="badge px-1 me-1 components-label silence-detail">
              <FontAwesomeIcon
                className="text-muted me-1"
                icon={faCalendarCheck}
                fixedWidth
              />
              Started <DateFromNow timestamp={silence.startsAt} />
            </span>
            <span
              className={`badge ${expiresClass} px-1 me-1 components-label silence-detail`}
            >
              <FontAwesomeIcon
                className="text-muted me-1"
                icon={faCalendarTimes}
                fixedWidth
              />
              {expiresLabel} <DateFromNow timestamp={silence.endsAt} />
            </span>
          </div>
          <div className="my-1 d-flex flex-row">
            <span className="badge px-1 me-1 components-label silence-detail flex-grow-0 flex-shrink-0">
              <FontAwesomeIcon
                className="text-muted me-1"
                icon={faFingerprint}
                fixedWidth
              />
              ID:
            </span>
            <span className="badge bg-light px-1 me-1 components-label silence-id">
              {silence.id}
            </span>
            <SilenceIDCopyButton id={silence.id} />
          </div>
          <div className="my-1">
            <span className="badge px-1 me-1 components-label silence-detail">
              <FontAwesomeIcon
                className="text-muted me-1"
                icon={faHome}
                fixedWidth
              />
              View in Alertmanager:
            </span>
            {alertmanagers.map((alertmanager) => (
              <RenderLinkAnnotation
                key={alertmanager.name}
                name={alertmanager.name}
                value={`${alertmanager.publicURI}/#/silences/${silence.id}`}
              />
            ))}
          </div>
          <div className="d-flex flex-row">
            <div className="flex-shrink-0 flex-grow-0">
              <span className="badge px-1 me-1 components-label silence-detail">
                <FontAwesomeIcon
                  className="text-muted me-1"
                  icon={faFilter}
                  fixedWidth
                />
                Matchers:
              </span>
            </div>
            <div
              className="flex-shrink-1 flex-grow-1 mw-1p"
              style={{ minWidth: "0px" }}
            >
              {silence.matchers.map((matcher, index) => (
                <span
                  key={`${index}/${matcher.name}/${matcher.isRegex}/${matcher.value}`}
                  className={`badge ${
                    matcher.isEqual
                      ? "silence-matcher-equal"
                      : "silence-matcher-negative"
                  } px-1 me-1 components-label`}
                >
                  {matcher.name}
                  {MatcherToOperator(matcher)}"{matcher.value}"
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex-grow-0 mt-lg-0 mt-2 ml-lg-2 ms-0">
          <div className="d-flex flex-fill flex-lg-column flex-row justify-content-around">
            <button
              className="btn btn-primary btn-sm mb-lg-2 mb-0"
              disabled={isReadOnly}
              onClick={() => {
                !isReadOnly && onEditSilence();
              }}
            >
              <FontAwesomeIcon
                className="me-1 d-none d-sm-inline-block"
                icon={faEdit}
              />
              {isExpired ? "Recreate" : "Edit"}
            </button>
            {!isExpired && (
              <DeleteSilence
                alertStore={alertStore}
                silenceFormStore={silenceFormStore}
                cluster={cluster}
                silence={silence}
                isUpper={isUpper}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { SilenceDetails };

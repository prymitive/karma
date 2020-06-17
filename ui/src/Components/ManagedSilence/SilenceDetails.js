import React, { useState } from "react";
import PropTypes from "prop-types";

import parseISO from "date-fns/parseISO";

import copy from "copy-to-clipboard";

import Flash from "react-reveal/Flash";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faCalendarCheck } from "@fortawesome/free-solid-svg-icons/faCalendarCheck";
import { faCalendarTimes } from "@fortawesome/free-solid-svg-icons/faCalendarTimes";
import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";
import { faHome } from "@fortawesome/free-solid-svg-icons/faHome";
import { faFingerprint } from "@fortawesome/free-solid-svg-icons/faFingerprint";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";

import { APISilence } from "Models/API";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { QueryOperators } from "Common/Query";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { RenderLinkAnnotation } from "Components/Grid/AlertGrid/AlertGroup/Annotation";
import { DateFromNow } from "Components/DateFromNow";
import { DeleteSilence } from "./DeleteSilence";

const SilenceIDCopyButton = ({ id }) => {
  const [clickCount, setClickCount] = useState(0);
  return (
    <TooltipWrapper title="Copy silence ID to the clipboard">
      <Flash spy={clickCount} duration={500}>
        <span
          className="badge badge-secondary px-1 mr-1 components-label cursor-pointer"
          onClick={() => {
            copy(id);
            setClickCount(clickCount + 1);
          }}
        >
          <FontAwesomeIcon icon={faCopy} />
        </span>
      </Flash>
    </TooltipWrapper>
  );
};

const SilenceDetails = ({
  alertStore,
  silenceFormStore,
  silence,
  cluster,
  onEditSilence,
  isUpper,
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
            <span className="badge px-1 mr-1 components-label">
              <FontAwesomeIcon
                className="text-muted mr-1"
                icon={faCalendarCheck}
                fixedWidth
              />
              Started <DateFromNow timestamp={silence.startsAt} />
            </span>
            <span
              className={`badge ${expiresClass} px-1 mr-1 components-label`}
            >
              <FontAwesomeIcon
                className="text-muted mr-1"
                icon={faCalendarTimes}
                fixedWidth
              />
              {expiresLabel} <DateFromNow timestamp={silence.endsAt} />
            </span>
          </div>
          <div className="my-1 d-flex flex-row">
            <span className="badge px-1 mr-1 components-label flex-grow-0 flex-shrink-0">
              <FontAwesomeIcon
                className="text-muted mr-1"
                icon={faFingerprint}
                fixedWidth
              />
              ID:
            </span>
            <span className="badge badge-light px-1 mr-1 components-label">
              {silence.id}
            </span>
            <SilenceIDCopyButton id={silence.id} />
          </div>
          <div className="my-1">
            <span className="badge px-1 mr-1 components-label">
              <FontAwesomeIcon
                className="text-muted mr-1"
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
              <span className="badge px-1 mr-1 components-label">
                <FontAwesomeIcon
                  className="text-muted mr-1"
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
                  className="badge badge-primary px-1 mr-1 components-label"
                >
                  {matcher.name}
                  {matcher.isRegex
                    ? QueryOperators.Regex
                    : QueryOperators.Equal}
                  {matcher.value}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex-grow-0 mt-lg-0 mt-2 ml-lg-2 ml-0">
          <div className="d-flex flex-fill flex-lg-column flex-row justify-content-around">
            <button
              className="btn btn-primary btn-sm mb-lg-2 mb-0"
              disabled={isReadOnly}
              onClick={() => {
                !isReadOnly && onEditSilence();
              }}
            >
              <FontAwesomeIcon
                className="mr-1 d-none d-sm-inline-block"
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
SilenceDetails.propTypes = {
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  cluster: PropTypes.string.isRequired,
  silence: APISilence.isRequired,
  onEditSilence: PropTypes.func.isRequired,
  isUpper: PropTypes.bool,
};
SilenceDetails.defaultProps = {
  isUpper: false,
};

export { SilenceDetails };

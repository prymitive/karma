import React from "react";
import PropTypes from "prop-types";

import hash from "object-hash";

import moment from "moment";
import Moment from "react-moment";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faCalendarCheck } from "@fortawesome/free-solid-svg-icons/faCalendarCheck";
import { faCalendarTimes } from "@fortawesome/free-solid-svg-icons/faCalendarTimes";
import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";
import { faHome } from "@fortawesome/free-solid-svg-icons/faHome";

import { APISilence } from "Models/API";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { QueryOperators } from "Common/Query";
import { RenderLinkAnnotation } from "Components/Grid/AlertGrid/AlertGroup/Annotation";
import { DeleteSilence } from "./DeleteSilence";

const SilenceDetails = ({
  alertStore,
  silenceFormStore,
  silence,
  cluster,
  onEditSilence,
  onDeleteModalClose
}) => {
  let isExpired = moment(silence.endsAt) < moment();
  let expiresClass = "";
  let expiresLabel = "Expires";
  if (isExpired) {
    expiresClass = "text-danger";
    expiresLabel = "Expired";
  }

  const alertmanagers = alertStore.data.upstreams.instances.filter(
    u => u.cluster === cluster
  );

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
              Started <Moment fromNow>{silence.startsAt}</Moment>
            </span>
            <span
              className={`badge ${expiresClass} px-1 mr-1 components-label`}
            >
              <FontAwesomeIcon
                className="text-muted mr-1"
                icon={faCalendarTimes}
                fixedWidth
              />
              {expiresLabel} <Moment fromNow>{silence.endsAt}</Moment>
            </span>
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
            {alertmanagers.map(alertmanager => (
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
              {silence.matchers.map(matcher => (
                <span
                  key={hash(matcher)}
                  className="badge badge-light px-1 mr-1 components-label"
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
              className="btn btn-outline-secondary btn-sm mb-lg-2 mb-0"
              onClick={onEditSilence}
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
                onModalExit={onDeleteModalClose}
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
  onDeleteModalClose: PropTypes.func
};

export { SilenceDetails };

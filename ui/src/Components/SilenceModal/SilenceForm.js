import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import Flash from "react-reveal/Flash";

import copy from "copy-to-clipboard";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons/faCommentDots";
import { faUndoAlt } from "@fortawesome/free-solid-svg-icons/faUndoAlt";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";
import { faShareAlt } from "@fortawesome/free-solid-svg-icons/faShareAlt";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";

import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  SilenceFormStage,
  NewEmptyMatcher,
  MatcherValueToObject,
  NewClusterRequest,
} from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { QueryOperators } from "Common/Query";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ToggleIcon } from "Components/ToggleIcon";
import { AlertManagerInput } from "./AlertManagerInput";
import { SilenceMatch } from "./SilenceMatch";
import { DateTimeSelect } from "./DateTimeSelect";
import { PayloadPreview } from "./PayloadPreview";
import { IconInput, AuthenticatedAuthorInput } from "./AuthorInput";

const ShareButton = ({ silenceFormStore }) => {
  const [clickCount, setClickCount] = useState(0);

  const baseURL = [
    window.location.protocol,
    "//",
    window.location.host,
    window.location.pathname,
  ].join("");

  return useObserver(() => (
    <div className="input-group mb-3">
      <div className="input-group-prepend">
        <span className="input-group-text">
          <TooltipWrapper title="Link to this form">
            <FontAwesomeIcon icon={faShareAlt} />
          </TooltipWrapper>
        </span>
      </div>
      <input
        type="text"
        className="form-control"
        value={`${baseURL}?m=${silenceFormStore.data.toBase64}`}
        onChange={() => {}}
      />
      <div className="input-group-append">
        <span
          className="input-group-text cursor-pointer"
          onClick={() => {
            copy(`${baseURL}?m=${silenceFormStore.data.toBase64}`);
            setClickCount(clickCount + 1);
          }}
        >
          <TooltipWrapper title="Copy to clipboard">
            <Flash spy={clickCount} duration={500}>
              <FontAwesomeIcon icon={faCopy} />
            </Flash>
          </TooltipWrapper>
        </span>
      </div>
    </div>
  ));
};

const SilenceForm = ({
  alertStore,
  silenceFormStore,
  settingsStore,
  previewOpen,
}) => {
  const [showPreview, setShowPreview] = useState(previewOpen);

  useEffect(() => {
    // reset startsAt & endsAt on every mount, unless we're editing a silence
    if (
      silenceFormStore.data.silenceID === null &&
      silenceFormStore.data.resetInputs === true
    ) {
      silenceFormStore.data.resetStartEnd();
    } else {
      silenceFormStore.data.verifyStarEnd();
    }

    // reset cluster request state
    silenceFormStore.data.requestsByCluster = {};

    if (silenceFormStore.data.autofillMatchers) {
      silenceFormStore.data.matchers = [];

      if (alertStore.filters.values.length > 0) {
        alertStore.filters.values
          .filter(
            (f) =>
              f.name[0] !== "@" &&
              (f.matcher === QueryOperators.Equal ||
                f.matcher === QueryOperators.Regex)
          )
          .forEach((f) => {
            const matcher = NewEmptyMatcher();
            matcher.name = f.name;
            if (f.matcher === QueryOperators.Regex) {
              matcher.values = [MatcherValueToObject(`.*${f.value}.*`)];
              matcher.isRegex = f.matcher === QueryOperators.Regex;
            } else {
              matcher.values = [MatcherValueToObject(f.value)];
            }
            silenceFormStore.data.matchers.push(matcher);
          });
      }
    }

    if (silenceFormStore.data.matchers.length === 0) {
      silenceFormStore.data.addEmptyMatcher();
    }

    silenceFormStore.data.autofillMatchers = false;
    silenceFormStore.data.resetInputs = true;

    // populate author
    if (silenceFormStore.data.author === "") {
      silenceFormStore.data.author =
        settingsStore.silenceFormConfig.config.author;
    }

    if (alertStore.info.authentication.enabled) {
      silenceFormStore.data.author = alertStore.info.authentication.username;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addMore = (event) => {
    event.preventDefault();
    silenceFormStore.data.addEmptyMatcher();
  };

  const onAuthorChange = (event) => {
    silenceFormStore.data.author = event.target.value;
  };

  const onCommentChange = (event) => {
    silenceFormStore.data.comment = event.target.value;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    let rbc = {};
    silenceFormStore.data.alertmanagers.forEach((am) => {
      rbc[am.label] = NewClusterRequest(am.label, am.value);
    });
    silenceFormStore.data.requestsByCluster = rbc;

    settingsStore.silenceFormConfig.saveAuthor(silenceFormStore.data.author);

    if (silenceFormStore.data.isValid)
      silenceFormStore.data.currentStage = SilenceFormStage.Preview;

    silenceFormStore.data.wasValidated = true;
  };

  return useObserver(() => (
    <form onSubmit={handleSubmit} autoComplete="on">
      <div className="mb-3">
        <AlertManagerInput
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
        />
      </div>
      {silenceFormStore.data.matchers.map((matcher) => (
        <SilenceMatch
          key={matcher.id}
          silenceFormStore={silenceFormStore}
          matcher={matcher}
          onDelete={() => {
            silenceFormStore.data.deleteMatcher(matcher.id);
          }}
          showDelete={silenceFormStore.data.matchers.length > 1}
          isValid={!silenceFormStore.data.wasValidated}
        />
      ))}
      <div className="d-flex flex-row justify-content-between mb-3">
        <TooltipWrapper title="Add a matcher">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={addMore}
          >
            <FontAwesomeIcon icon={faPlus} fixedWidth />
          </button>
        </TooltipWrapper>
      </div>
      <DateTimeSelect silenceFormStore={silenceFormStore} />
      {alertStore.info.authentication.enabled ? (
        <AuthenticatedAuthorInput alertStore={alertStore} />
      ) : (
        <IconInput
          type="text"
          autoComplete="email"
          placeholder="Author"
          icon={faUser}
          value={silenceFormStore.data.author}
          onChange={onAuthorChange}
        />
      )}

      <IconInput
        type="text"
        autoComplete="on"
        placeholder="Comment"
        icon={faCommentDots}
        value={silenceFormStore.data.comment}
        onChange={onCommentChange}
      />
      <div className="d-flex flex-row justify-content-between">
        <span
          className="btn px-0 cursor-pointer text-muted"
          onClick={() => setShowPreview(!showPreview)}
        >
          <ToggleIcon isOpen={showPreview} />
        </span>
        <span>
          {silenceFormStore.data.silenceID === null ? null : (
            <button
              type="button"
              className="btn btn-danger mr-2"
              onClick={silenceFormStore.data.resetSilenceID}
            >
              <FontAwesomeIcon icon={faUndoAlt} className="mr-1" />
              Reset
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            <FontAwesomeIcon icon={faSearch} className="mr-1" />
            Preview
          </button>
        </span>
      </div>
      {showPreview ? (
        <div className="mt-4">
          <ShareButton silenceFormStore={silenceFormStore} />
          <PayloadPreview silenceFormStore={silenceFormStore} />
        </div>
      ) : null}
    </form>
  ));
};
SilenceForm.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  previewOpen: PropTypes.bool.isRequired,
};

export { SilenceForm };

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons/faCommentDots";
import { faUndoAlt } from "@fortawesome/free-solid-svg-icons/faUndoAlt";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";

import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  SilenceFormStage,
  NewEmptyMatcher,
  MatcherValueToObject,
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

const SilenceForm = ({
  alertStore,
  silenceFormStore,
  settingsStore,
  previewOpen,
}) => {
  const [showPreview, setShowPreview] = useState(previewOpen);

  useEffect(() => {
    // reset startsAt & endsAt on every mount, unless we're editing a silence
    if (silenceFormStore.data.silenceID === null) {
      silenceFormStore.data.resetStartEnd();
    } else {
      silenceFormStore.data.verifyStarEnd();
    }

    if (
      silenceFormStore.data.matchers.filter(
        (m) => m.name !== "" || m.values.length
      ).length === 0
    ) {
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
      <TooltipWrapper title="Add a matcher">
        <button
          type="button"
          className="btn btn-secondary mb-3"
          onClick={addMore}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </TooltipWrapper>
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
        <PayloadPreview silenceFormStore={silenceFormStore} />
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

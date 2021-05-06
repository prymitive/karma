import { FC, useEffect, useState, MouseEvent, FormEvent } from "react";

import semverLt from "semver/functions/lt";

import { observer } from "mobx-react-lite";

import copy from "copy-to-clipboard";

import { CSSTransition } from "react-transition-group";

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
  NewEmptyMatcher,
  NewClusterRequest,
  ClusterRequestT,
} from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { StringToOption } from "Common/Select";
import { QueryOperators } from "Common/Query";
import { useFlashTransition } from "Hooks/useFlashTransition";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ToggleIcon } from "Components/ToggleIcon";
import { AlertManagerInput } from "./AlertManagerInput";
import SilenceMatch from "./SilenceMatch";
import { DateTimeSelect } from "./DateTimeSelect";
import PayloadPreview from "./PayloadPreview";
import { IconInput, AuthenticatedAuthorInput } from "./AuthorInput";

const ShareButton: FC<{
  silenceFormStore: SilenceFormStore;
}> = observer(({ silenceFormStore }) => {
  const [clickCount, setClickCount] = useState<number>(0);

  const baseURL = [
    window.location.protocol,
    "//",
    window.location.host,
    window.location.pathname,
  ].join("");

  const { ref, props } = useFlashTransition(clickCount);

  return (
    <div className="input-group mb-3">
      <span className="input-group-text text-muted">
        <TooltipWrapper title="Link to this form">
          <FontAwesomeIcon icon={faShareAlt} />
        </TooltipWrapper>
      </span>
      <input
        type="text"
        className="form-control"
        value={`${baseURL}?m=${silenceFormStore.data.toBase64}`}
        onChange={() => {}}
      />
      <span
        ref={ref}
        className="input-group-text text-muted cursor-pointer"
        onClick={() => {
          copy(`${baseURL}?m=${silenceFormStore.data.toBase64}`);
          setClickCount(clickCount + 1);
        }}
      >
        <TooltipWrapper title="Copy to clipboard">
          <CSSTransition {...props}>
            <FontAwesomeIcon icon={faCopy} />
          </CSSTransition>
        </TooltipWrapper>
      </span>
    </div>
  );
});

const SilenceForm: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
  previewOpen: boolean;
}> = ({ alertStore, silenceFormStore, settingsStore, previewOpen }) => {
  const [showPreview, setShowPreview] = useState<boolean>(previewOpen);

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
    silenceFormStore.data.setRequestsByCluster({});

    if (silenceFormStore.data.autofillMatchers) {
      silenceFormStore.data.setMatchers([]);

      if (alertStore.filters.values.length > 0) {
        alertStore.filters.values
          .filter(
            (f) =>
              f.name[0] !== "@" &&
              (f.matcher === QueryOperators.Equal ||
                f.matcher === QueryOperators.NotEqual ||
                f.matcher === QueryOperators.Regex ||
                f.matcher === QueryOperators.NegativeRegex)
          )
          .forEach((f) => {
            const matcher = NewEmptyMatcher();
            matcher.name = f.name;
            if (
              f.matcher === QueryOperators.Regex ||
              f.matcher === QueryOperators.NegativeRegex
            ) {
              matcher.values = [StringToOption(`.*${f.value}.*`)];
              matcher.isRegex = true;
              matcher.isEqual = f.matcher === QueryOperators.Regex;
            } else {
              matcher.values = [StringToOption(f.value)];
              matcher.isEqual = f.matcher === QueryOperators.Equal;
            }
            silenceFormStore.data.addMatcherWithID(matcher);
          });
      }
    }

    if (silenceFormStore.data.matchers.length === 0) {
      silenceFormStore.data.addEmptyMatcher();
    }

    silenceFormStore.data.setAutofillMatchers(false);
    silenceFormStore.data.setResetInputs(true);

    // populate author
    if (silenceFormStore.data.author === "") {
      silenceFormStore.data.setAuthor(
        settingsStore.silenceFormConfig.config.author
      );
    }

    if (alertStore.info.authentication.enabled) {
      silenceFormStore.data.setAuthor(alertStore.info.authentication.username);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addMore = (event: MouseEvent) => {
    event.preventDefault();
    silenceFormStore.data.addEmptyMatcher();
  };

  const onAuthorChange = (author: string) => {
    silenceFormStore.data.setAuthor(author);
  };

  const onCommentChange = (comment: string) => {
    silenceFormStore.data.setComment(comment);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const rbc: { [label: string]: ClusterRequestT } = {};
    silenceFormStore.data.alertmanagers.forEach((am) => {
      rbc[am.label] = NewClusterRequest(am.label, am.value);
    });
    silenceFormStore.data.setRequestsByCluster(rbc);

    settingsStore.silenceFormConfig.saveAuthor(silenceFormStore.data.author);

    if (silenceFormStore.data.isValid)
      silenceFormStore.data.setStage("preview");

    silenceFormStore.data.setWasValidated(true);
  };

  return (
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
          enableIsEqual={
            !semverLt(
              alertStore.data.getMinVersion(
                silenceFormStore.data.alertmanagers
                  .map((am) => am.value)
                  .reduce((a, b) => [...a, ...b], [])
              ),
              "0.22.0"
            )
          }
        />
      ))}
      <div className="d-flex flex-row justify-content-between mb-3">
        <TooltipWrapper title="Add a matcher">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
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
          onChange={(event) => onAuthorChange(event.target.value)}
        />
      )}

      <IconInput
        type="text"
        autoComplete="on"
        placeholder="Comment"
        icon={faCommentDots}
        value={silenceFormStore.data.comment}
        onChange={(event) => onCommentChange(event.target.value)}
      />
      <div className="d-flex flex-row justify-content-between">
        <span
          className="badge components-label cursor-pointer with-click text-muted my-auto"
          onClick={() => setShowPreview(!showPreview)}
        >
          <ToggleIcon isOpen={showPreview} />
        </span>
        <span>
          {silenceFormStore.data.silenceID === null ? null : (
            <button
              type="button"
              className="btn btn-danger me-2"
              onClick={silenceFormStore.data.resetSilenceID}
            >
              <FontAwesomeIcon icon={faUndoAlt} className="me-1" />
              Reset
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            <FontAwesomeIcon icon={faSearch} className="me-1" />
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
  );
};

export default observer(SilenceForm);

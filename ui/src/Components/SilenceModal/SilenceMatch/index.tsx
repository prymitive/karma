import { FC, useEffect } from "react";

import { action } from "mobx";
import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

import { SilenceFormStore, MatcherWithIDT } from "Stores/SilenceFormStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { LabelNameInput } from "./LabelNameInput";
import { LabelValueInput } from "./LabelValueInput";

const SilenceMatch: FC<{
  silenceFormStore: SilenceFormStore;
  matcher: MatcherWithIDT;
  showDelete: boolean;
  onDelete: () => void;
  isValid: boolean;
  enableIsEqual: boolean;
}> = ({
  silenceFormStore,
  matcher,
  showDelete,
  onDelete,
  isValid,
  enableIsEqual,
}) => {
  const setIsEqual = action(() => (matcher.isEqual = true));

  useEffect(() => {
    if (!enableIsEqual) {
      setIsEqual();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableIsEqual]);

  return (
    <div className="d-flex flex-fill flex-lg-row align-items-center flex-column mb-3">
      <div
        className="flex-shrink-0 flex-grow-0 pe-lg-2 pb-2 pb-lg-0 w-100"
        style={{ flexBasis: "25%" }}
      >
        <LabelNameInput matcher={matcher} isValid={isValid} />
      </div>
      <div
        className="flex-shrink-0 flex-grow-0 pe-lg-2 pb-2 pb-lg-0 w-100"
        style={{ flexBasis: "40%" }}
      >
        <LabelValueInput
          silenceFormStore={silenceFormStore}
          matcher={matcher}
          isValid={isValid}
        />
      </div>
      <div
        className="flex-shrink-0 flex-grow-1 w-100"
        style={{ flexBasis: "15%" }}
      >
        <div className="d-flex justify-content-between form-check form-check-inline m-0 p-0">
          <div>
            <span className="form-check form-switch">
              <input
                id={`isEqual-${matcher.id}`}
                className="form-check-input"
                type="checkbox"
                value=""
                checked={matcher.isEqual}
                onChange={(event) => {
                  matcher.isEqual = event.target.checked;
                }}
                disabled={!enableIsEqual}
              />
              <label
                className="form-check-label cursor-pointer me-3"
                htmlFor={`isEqual-${matcher.id}`}
              >
                {matcher.isEqual ? "Silence matches" : "Exclude matches"}
              </label>
            </span>
            <span className="form-check form-switch">
              <input
                id={`isRegex-${matcher.id}`}
                className="form-check-input"
                type="checkbox"
                value=""
                checked={matcher.isRegex}
                onChange={(event) => {
                  if (matcher.values.length <= 1) {
                    matcher.isRegex = event.target.checked;
                  }
                }}
                disabled={matcher.values.length > 1}
              />
              <label
                className="form-check-label cursor-pointer me-3"
                htmlFor={`isRegex-${matcher.id}`}
              >
                Regex
              </label>
            </span>
          </div>
          {showDelete ? (
            <TooltipWrapper title="Remove this matcher">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={onDelete}
              >
                <FontAwesomeIcon icon={faTrash} fixedWidth />
              </button>
            </TooltipWrapper>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default observer(SilenceMatch);

import React, { Component } from "react";
import PropTypes from "prop-types";

import { action } from "mobx";
import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

import { LabelNameInput } from "./LabelNameInput";
import { LabelValueInput } from "./LabelValueInput";

const SilenceMatch = observer(
  class SilenceMatch extends Component {
    static propTypes = {
      matcher: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        values: PropTypes.array.isRequired,
        isRegex: PropTypes.bool.isRequired
      }),
      showDelete: PropTypes.bool.isRequired,
      onDelete: PropTypes.func.isRequired,
      isValid: PropTypes.bool.isRequired
    };

    onIsRegexChange = action(event => {
      const { matcher } = this.props;

      // only allow to change value if we don't have multiple values
      if (matcher.values.length <= 1) {
        matcher.isRegex = event.target.checked;
      }
    });

    render() {
      const { matcher, showDelete, onDelete, isValid } = this.props;

      return (
        <div className="d-flex flex-fill flex-lg-row flex-column mb-3">
          <div className="flex-shrink-0 flex-grow-0 flex-basis-25 pr-lg-2 pb-2 pb-lg-0">
            <LabelNameInput matcher={matcher} isValid={isValid} />
          </div>
          <div className="flex-shrink-0 flex-grow-0 flex-basis-50 pr-lg-2 pb-2 pb-lg-0">
            <LabelValueInput matcher={matcher} isValid={isValid} />
          </div>
          <div className="flex-shrink-0 flex-grow-1 flex-basis-auto form-check form-check-inline d-flex justify-content-between m-0">
            <span>
              <input
                id={`isRegex-${matcher.id}`}
                className="form-check-input"
                type="checkbox"
                value=""
                checked={matcher.isRegex}
                onChange={this.onIsRegexChange}
                disabled={matcher.values.length > 1}
              />
              <label
                className="form-check-label cursor-pointer mr-3"
                htmlFor={`isRegex-${matcher.id}`}
              >
                Regex
              </label>
            </span>
            {showDelete ? (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={onDelete}
                data-tooltip="Remove this rule"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            ) : null}
          </div>
        </div>
      );
    }
  }
);

export { SilenceMatch };

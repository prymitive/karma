import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons/faCommentDots";
import { faUndoAlt } from "@fortawesome/free-solid-svg-icons/faUndoAlt";
import { faSave } from "@fortawesome/free-regular-svg-icons/faSave";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { AlertManagerInput } from "./AlertManagerInput";
import { SilenceMatch } from "./SilenceMatch";
import { DateTimeSelect } from "./DateTimeSelect";
import { SilencePreview } from "./SilencePreview";

const IconInput = ({
  type,
  autoComplete,
  icon,
  placeholder,
  value,
  onChange
}) => (
  <div className="input-group mb-3">
    <div className="input-group-prepend">
      <span className="input-group-text">
        <FontAwesomeIcon icon={icon} />
      </span>
    </div>
    <input
      type={type}
      className="form-control"
      placeholder={placeholder}
      value={value}
      required
      autoComplete={autoComplete}
      onChange={onChange}
    />
  </div>
);
IconInput.propTypes = {
  type: PropTypes.string.isRequired,
  autoComplete: PropTypes.string.isRequired,
  icon: FontAwesomeIcon.propTypes.icon.isRequired,
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

const SilenceForm = observer(
  class SilenceForm extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired
    };

    // store preview visibility state here, by default preview is collapsed
    // and user needs to expand it
    previewCollapse = observable(
      {
        hidden: true,
        toggle() {
          this.hidden = !this.hidden;
        }
      },
      { toggle: action.bound },
      { name: "Silence preview collpase toggle" }
    );

    componentDidMount() {
      const { silenceFormStore, settingsStore } = this.props;

      // reset startsAt & endsAt on every mount, unless we're editing a silence
      if (silenceFormStore.data.silenceID === null) {
        silenceFormStore.data.resetStartEnd();
      } else {
        silenceFormStore.data.verifyStarEnd();
      }

      if (silenceFormStore.data.matchers.length === 0) {
        silenceFormStore.data.addEmptyMatcher();
      }

      if (silenceFormStore.data.author === "") {
        silenceFormStore.data.author =
          settingsStore.silenceFormConfig.config.author;
      }
    }

    addMore = action(event => {
      const { silenceFormStore } = this.props;

      event.preventDefault();

      silenceFormStore.data.addEmptyMatcher();
    });

    onAuthorChange = action(event => {
      const { silenceFormStore } = this.props;
      silenceFormStore.data.author = event.target.value;
    });

    onCommentChange = action(event => {
      const { silenceFormStore } = this.props;
      silenceFormStore.data.comment = event.target.value;
    });

    handleSubmit = action(event => {
      const { silenceFormStore, settingsStore } = this.props;

      event.preventDefault();

      settingsStore.silenceFormConfig.saveAuthor(silenceFormStore.data.author);

      if (silenceFormStore.data.isValid)
        silenceFormStore.data.inProgress = true;

      silenceFormStore.data.wasValidated = true;
    });

    render() {
      const { alertStore, silenceFormStore } = this.props;

      return (
        <form onSubmit={this.handleSubmit} autoComplete="on">
          <div className="mb-3">
            <AlertManagerInput
              alertStore={alertStore}
              silenceFormStore={silenceFormStore}
            />
          </div>
          {silenceFormStore.data.matchers.map(matcher => (
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
          <button
            type="button"
            className="btn btn-outline-secondary mb-3"
            onClick={this.addMore}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <DateTimeSelect silenceFormStore={silenceFormStore} />
          <IconInput
            type="email"
            autoComplete="email"
            placeholder="Author email"
            icon={faUser}
            value={silenceFormStore.data.author}
            onChange={this.onAuthorChange}
          />
          <IconInput
            type="text"
            autoComplete="on"
            placeholder="Comment"
            icon={faCommentDots}
            value={silenceFormStore.data.comment}
            onChange={this.onCommentChange}
          />
          <div className="d-flex flex-row justify-content-between">
            <span
              className="btn px-0 cursor-pointer text-muted"
              onClick={this.previewCollapse.toggle}
            >
              <FontAwesomeIcon
                icon={this.previewCollapse.hidden ? faChevronUp : faChevronDown}
              />
            </span>
            <span>
              {silenceFormStore.data.silenceID === null ? null : (
                <button
                  type="button"
                  className="btn btn-outline-danger mr-2"
                  onClick={silenceFormStore.data.resetSilenceID}
                >
                  <FontAwesomeIcon icon={faUndoAlt} className="mr-1" />
                  Reset
                </button>
              )}
              <button type="submit" className="btn btn-outline-primary">
                <FontAwesomeIcon icon={faSave} className="mr-1" />
                Submit
              </button>
            </span>
          </div>
          {this.previewCollapse.hidden ? null : (
            <SilencePreview silenceFormStore={silenceFormStore} />
          )}
        </form>
      );
    }
  }
);

export { SilenceForm };

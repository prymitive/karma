import React, { Component } from "react";
import PropTypes from "prop-types";

import { action, observable } from "mobx";
import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons/faCommentDots";
import { faUndoAlt } from "@fortawesome/free-solid-svg-icons/faUndoAlt";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, SilenceFormStage } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { ToggleIcon } from "Components/ToggleIcon";
import { AlertManagerInput } from "./AlertManagerInput";
import { SilenceMatch } from "./SilenceMatch";
import { DateTimeSelect } from "./DateTimeSelect";
import { PayloadPreview } from "./PayloadPreview";
import { IconInput, AuthenticatedAuthorInput } from "./AuthorInput";

const SilenceForm = observer(
  class SilenceForm extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      previewOpen: PropTypes.bool.isRequired,
    };

    constructor(props) {
      super(props);

      // store preview visibility state here, by default preview is collapsed
      // and user needs to expand it
      this.previewCollapse = observable(
        {
          hidden: !props.previewOpen,
          toggle() {
            this.hidden = !this.hidden;
          },
        },
        { toggle: action.bound },
        { name: "Silence preview collpase toggle" }
      );
    }

    componentDidMount() {
      const { silenceFormStore } = this.props;

      // reset startsAt & endsAt on every mount, unless we're editing a silence
      if (silenceFormStore.data.silenceID === null) {
        silenceFormStore.data.resetStartEnd();
      } else {
        silenceFormStore.data.verifyStarEnd();
      }

      if (silenceFormStore.data.matchers.length === 0) {
        silenceFormStore.data.addEmptyMatcher();
      }

      this.populateAuthor();
    }

    populateAuthor = action(() => {
      const { alertStore, silenceFormStore, settingsStore } = this.props;

      if (silenceFormStore.data.author === "") {
        silenceFormStore.data.author =
          settingsStore.silenceFormConfig.config.author;
      }

      if (alertStore.info.authentication.enabled) {
        silenceFormStore.data.author = alertStore.info.authentication.username;
      }
    });

    addMore = action((event) => {
      const { silenceFormStore } = this.props;

      event.preventDefault();

      silenceFormStore.data.addEmptyMatcher();
    });

    onAuthorChange = action((event) => {
      const { silenceFormStore } = this.props;
      silenceFormStore.data.author = event.target.value;
    });

    onCommentChange = action((event) => {
      const { silenceFormStore } = this.props;
      silenceFormStore.data.comment = event.target.value;
    });

    handleSubmit = action((event) => {
      const { silenceFormStore, settingsStore } = this.props;

      event.preventDefault();

      settingsStore.silenceFormConfig.saveAuthor(silenceFormStore.data.author);

      if (silenceFormStore.data.isValid)
        silenceFormStore.data.currentStage = SilenceFormStage.Preview;

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
              onClick={this.addMore}
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
              onChange={this.onAuthorChange}
            />
          )}

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
              <ToggleIcon isOpen={!this.previewCollapse.hidden} />
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
          {this.previewCollapse.hidden ? null : (
            <PayloadPreview silenceFormStore={silenceFormStore} />
          )}
        </form>
      );
    }
  }
);

export { SilenceForm };

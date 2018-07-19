import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, toJS } from "mobx";
import { observer, inject } from "mobx-react";

import Linkify from "react-linkify";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faSearchPlus } from "@fortawesome/free-solid-svg-icons/faSearchPlus";
import { faSearchMinus } from "@fortawesome/free-solid-svg-icons/faSearchMinus";

const RenderNonLinkAnnotation = inject("alertStore")(
  observer(
    class RenderNonLinkAnnotation extends Component {
      static propTypes = {
        alertStore: PropTypes.object.isRequired,
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
      };

      // keep state of this annotation visibility, this is controlled by user
      toggle = observable(
        {
          visible: true,
          show() {
            this.visible = true;
          },
          hide() {
            this.visible = false;
          }
        },
        {
          show: action.bound,
          hide: action.bound
        }
      );

      constructor(props) {
        super(props);

        this.toggle.visible = this.isVisible();
      }

      // determinate if this annotation should be hidden by default or not
      isVisible() {
        const { alertStore, name } = this.props;

        const annotationsHidden = toJS(
          alertStore.settings.values.annotationsHidden
        );
        const isInHidden =
          annotationsHidden !== null && annotationsHidden.indexOf(name) >= 0;

        const annotationsVisible = toJS(
          alertStore.settings.values.annotationsVisible
        );
        const isInVisible =
          annotationsVisible !== null && annotationsVisible.indexOf(name) >= 0;

        if (isInVisible) return true;

        if (
          toJS(alertStore.settings.values.annotationsDefaultHidden) === true ||
          isInHidden === true
        ) {
          return false;
        }

        return true;
      }

      render() {
        const { name, value } = this.props;

        if (!this.toggle.visible) {
          return (
            <span
              className="text-nowrap text-truncate px-1 mr-1 badge badge-light cursor-pointer"
              onClick={this.toggle.show}
            >
              <FontAwesomeIcon icon={faSearchPlus} className="mr-1" />
              {name}
            </span>
          );
        }

        return (
          <span
            key={name}
            className="text-nowrap text-truncate px-1 mr-1 badge badge-light cursor-pointer"
            onClick={this.toggle.hide}
          >
            <FontAwesomeIcon icon={faSearchMinus} className="mr-1" />
            <span className="text-muted">{name}: </span>
            <Linkify>{value}</Linkify>
          </span>
        );
      }
    }
  )
);

const RenderLinkAnnotation = ({ name, value }) => {
  return (
    <a
      key={name}
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="text-nowrap text-truncate badge badge-secondary mr-1"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> {name}
    </a>
  );
};
RenderLinkAnnotation.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired
};

export { RenderNonLinkAnnotation, RenderLinkAnnotation };

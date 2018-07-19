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
        value: PropTypes.string.isRequired,
        afterUpdate: PropTypes.func.isRequired
      };

      // keep state of this annotation visibility, this is controlled by user
      toggle = observable(
        {
          visible: true,
          show(e) {
            // don't action link clicks inside Linkify
            if (e.target.nodeName !== "A") this.visible = true;
          },
          hide(e) {
            // don't action link clicks inside Linkify
            if (e.target.nodeName !== "A") this.visible = false;
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

      componentDidUpdate() {
        const { afterUpdate } = this.props;

        afterUpdate();
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

        const className =
          "mr-1 mb-1 p-1 bg-light cursor-pointer d-inline-block rounded";

        if (!this.toggle.visible) {
          return (
            <div className={className} onClick={this.toggle.show}>
              <FontAwesomeIcon icon={faSearchPlus} className="mr-1" />
              {name}
            </div>
          );
        }

        return (
          <div key={name} className={className} onClick={this.toggle.hide}>
            <FontAwesomeIcon icon={faSearchMinus} className="mr-1" />
            <span className="text-muted">{name}: </span>
            <Linkify
              properties={{
                target: "_blank",
                rel: "noopener noreferrer"
              }}
            >
              {value}
            </Linkify>
          </div>
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

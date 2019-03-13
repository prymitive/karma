import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import Linkify from "react-linkify";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faSearchPlus } from "@fortawesome/free-solid-svg-icons/faSearchPlus";
import { faSearchMinus } from "@fortawesome/free-solid-svg-icons/faSearchMinus";

import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";

import "./index.css";

const RenderNonLinkAnnotation = inject("alertStore")(
  observer(
    class RenderNonLinkAnnotation extends Component {
      static propTypes = {
        alertStore: PropTypes.instanceOf(AlertStore).isRequired,
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        visible: PropTypes.bool.isRequired,
        afterUpdate: PropTypes.func.isRequired
      };

      // keep state of this annotation visibility, this is controlled by user
      toggle = observable(
        {
          visible: true,
          show(e) {
            // Linkify only handles value, no need to check for links of
            // collapsed annotation
            this.visible = true;
          },
          hide(e) {
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

        this.toggle.visible = props.visible;
      }

      componentDidUpdate() {
        const { afterUpdate } = this.props;

        afterUpdate();
      }

      render() {
        const { name, value } = this.props;

        const className =
          "mr-1 mb-1 p-1 bg-light d-inline-block rounded components-grid-annotation text-break";

        if (!this.toggle.visible) {
          return (
            <TooltipWrapper title="Click to show annotation value">
              <div
                className={`${className} cursor-pointer`}
                onClick={this.toggle.show}
              >
                <FontAwesomeIcon icon={faSearchPlus} className="mr-1" />
                {name}
              </div>
            </TooltipWrapper>
          );
        }

        return (
          <TooltipWrapper title="Click the icon to hide annotation value">
            <div key={name} className={className}>
              <FontAwesomeIcon
                icon={faSearchMinus}
                className="mr-1 cursor-pointer"
                onClick={this.toggle.hide}
              />
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
          </TooltipWrapper>
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
      className="components-label-with-hover text-nowrap text-truncate badge mr-1 components-grid-annotation-link"
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

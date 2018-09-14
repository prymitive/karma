import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import Linkify from "react-linkify";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faSearchPlus } from "@fortawesome/free-solid-svg-icons/faSearchPlus";
import { faSearchMinus } from "@fortawesome/free-solid-svg-icons/faSearchMinus";

import "./index.css";

const RenderNonLinkAnnotation = inject("alertStore")(
  observer(
    class RenderNonLinkAnnotation extends Component {
      static propTypes = {
        alertStore: PropTypes.object.isRequired,
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

        this.toggle.visible = props.visible;
      }

      componentDidUpdate() {
        const { afterUpdate } = this.props;

        afterUpdate();
      }

      render() {
        const { name, value } = this.props;

        const className =
          "mr-1 mb-1 p-1 bg-light cursor-pointer d-inline-block rounded components-grid-annotation";

        if (!this.toggle.visible) {
          return (
            <div
              className={className}
              onClick={this.toggle.show}
              data-tooltip="Expand annotation"
            >
              <FontAwesomeIcon icon={faSearchPlus} className="mr-1" />
              {name}
            </div>
          );
        }

        return (
          <div
            key={name}
            className={className}
            onClick={this.toggle.hide}
            data-tooltip="Hide annotation"
          >
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
      className="components-label-with-hover text-nowrap text-truncate badge badge-secondary mr-1"
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

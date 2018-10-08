import React, { Component } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

import {
  MountModal,
  MountModalBackdrop
} from "Components/Animations/MountModal";

const Modal = observer(
  class Modal extends Component {
    static propTypes = {
      isOpen: PropTypes.bool.isRequired,
      children: PropTypes.node.isRequired
    };

    toggleBodyClass = isOpen => {
      document.body.classList.toggle("modal-open", isOpen);
      if (isOpen) {
        disableBodyScroll(document.querySelector(".modal"));
      } else {
        enableBodyScroll(document.querySelector(".modal"));
      }
    };

    componentDidMount() {
      const { isOpen } = this.props;
      this.toggleBodyClass(isOpen);
    }

    componentDidUpdate() {
      const { isOpen } = this.props;
      this.toggleBodyClass(isOpen);
    }

    componentWillUnmount() {
      this.toggleBodyClass(false);
    }

    render() {
      const { isOpen, children } = this.props;

      return ReactDOM.createPortal(
        <React.Fragment>
          <MountModal in={isOpen} unmountOnExit>
            <div className="modal d-block" role="dialog">
              <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">{children}</div>
              </div>
            </div>
          </MountModal>
          <MountModalBackdrop in={isOpen} unmountOnExit>
            <div className="modal-backdrop d-block" />
          </MountModalBackdrop>
        </React.Fragment>,
        document.body
      );
    }
  }
);

export { Modal };

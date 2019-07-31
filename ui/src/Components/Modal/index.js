import React, { Component } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { disableBodyScroll, clearAllBodyScrollLocks } from "body-scroll-lock";

import { HotKeys } from "react-hotkeys";

import {
  MountModal,
  MountModalBackdrop
} from "Components/Animations/MountModal";

const Modal = observer(
  class Modal extends Component {
    static propTypes = {
      size: PropTypes.oneOf(["lg", "xl"]),
      isOpen: PropTypes.bool.isRequired,
      toggleOpen: PropTypes.func.isRequired,
      children: PropTypes.node.isRequired
    };
    static defaultProps = {
      size: "lg"
    };

    constructor(props) {
      super(props);
      this.modalRef = React.createRef();
      this.HotKeysRef = React.createRef();
    }

    toggleBodyClass = isOpen => {
      document.body.classList.toggle("modal-open", isOpen);
      if (isOpen) {
        this.HotKeysRef.current.focus();
        disableBodyScroll(this.modalRef.current);
      } else {
        clearAllBodyScrollLocks();
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
      const { size, isOpen, toggleOpen, children, ...props } = this.props;

      return ReactDOM.createPortal(
        <HotKeys
          innerRef={this.HotKeysRef}
          keyMap={{ CLOSE: "Escape" }}
          handlers={{ CLOSE: toggleOpen }}
        >
          <MountModal in={isOpen} unmountOnExit {...props}>
            <div ref={this.modalRef} className="modal d-block" role="dialog">
              <div className={`modal-dialog modal-${size}`} role="document">
                <div className="modal-content">{children}</div>
              </div>
            </div>
          </MountModal>
          <MountModalBackdrop in={isOpen} unmountOnExit>
            <div className="modal-backdrop d-block" />
          </MountModalBackdrop>
        </HotKeys>,
        document.body
      );
    }
  }
);

export { Modal };

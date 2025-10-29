import React, { FC, ReactNode, useState, useEffect } from "react";
import ReactDOM from "react-dom";

import TransitionGroup from "react-transition-group/TransitionGroup";
import { CSSTransition } from "react-transition-group";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ThemeContext } from "Components/Theme";

const Toast: FC<{
  icon: IconDefinition;
  iconClass: string;
  message: ReactNode;
  hasClose: boolean;
  onClose?: () => void;
}> = ({ icon, iconClass, message, hasClose, onClose }) => {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const show = () => setIsOpen(true);
    window.addEventListener("showNotifications", show);
    return () => {
      window.removeEventListener("showNotifications", show);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`m-2 alert alert-${iconClass === "text-danger" ? "danger" : iconClass === "text-success" ? "success" : "warning"} alert-dismissible shadow`}
      style={{ minWidth: "350px", maxWidth: "450px" }}
    >
      <div className="d-flex align-items-start">
        <FontAwesomeIcon icon={icon} className="me-2 mt-1" />
        <div className="flex-grow-1">{message}</div>
        {hasClose ? (
          <button
            type="button"
            className="btn-close"
            onClick={() => {
              setIsOpen(false);
              if (onClose) {
                onClose();
              }
            }}
          ></button>
        ) : null}
      </div>
    </div>
  );
};

const ToastContainer: FC = ({ children }) => {
  const context = React.useContext(ThemeContext);

  return ReactDOM.createPortal(
    <div className="components-toast-container d-flex flex-column">
      <TransitionGroup component={null} appear enter exit>
        {React.Children.map(children, (toast, i) =>
          toast ? (
            <CSSTransition
              key={i}
              classNames="components-animation-fade"
              timeout={context.animations.duration}
              unmountOnExit
            >
              {toast}
            </CSSTransition>
          ) : null,
        )}
      </TransitionGroup>
    </div>,
    document.body,
  );
};

export { ToastContainer, Toast };

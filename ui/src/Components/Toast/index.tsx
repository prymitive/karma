import React, { FC, ReactNode, useState, useEffect } from "react";
import ReactDOM from "react-dom";

import TransitionGroup from "react-transition-group/TransitionGroup";
import { CSSTransition } from "react-transition-group";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons/faCircle";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

import { ThemeContext } from "Components/Theme";

const Toast: FC<{
  icon: IconDefinition;
  iconClass: string;
  message: ReactNode;
  hasClose: boolean;
}> = ({ icon, iconClass, message, hasClose }) => {
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
    <div className="m-1 bg-toast text-white rounded shadow">
      <div className="d-flex flex-row p-1">
        <div className="flex-shrink-0 flex-grow-0 align-self-center fa-stack fa-2x">
          <FontAwesomeIcon
            icon={faCircle}
            className={`fa-stack-2x ${iconClass}`}
          />
          <FontAwesomeIcon icon={icon} className="fa-stack-1x text-white" />
        </div>
        <div className="flex-shrink-1 flex-grow-1 align-self-center ms-1 me-3 text-break text-wrap">
          {message}
        </div>
        {hasClose ? (
          <div className="flex-shrink-0 flex-grow-0 align-self-top">
            <span
              className="badge components-label cursor-pointer with-click with-click-dark"
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ToastContainer: FC = ({ children }) => {
  const context = React.useContext(ThemeContext);

  return ReactDOM.createPortal(
    <div className="toast-container d-flex flex-column">
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
          ) : null
        )}
      </TransitionGroup>
    </div>,
    document.body
  );
};

export { ToastContainer, Toast };

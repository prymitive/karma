import React, { FC, ReactNode } from "react";
import ReactDOM from "react-dom";

import TransitionGroup from "react-transition-group/TransitionGroup";
import { CSSTransition } from "react-transition-group";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons/faCircle";

import { ThemeContext } from "Components/Theme";

const Toast: FC<{
  icon: IconDefinition;
  iconClass: string;
  message: ReactNode;
}> = ({ icon, iconClass, message }) => {
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
        <div className="flex-shrink-1 flex-grow-1 align-self-center ml-1 mr-3 text-break text-wrap">
          {message}
        </div>
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

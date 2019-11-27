import React from "react";
import ReactDOM from "react-dom";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun } from "@fortawesome/free-solid-svg-icons/faSun";

const DarkTheme = React.lazy(() => import("Styles/DarkTheme"));
const LightTheme = React.lazy(() => import("Styles/LightTheme"));

const Placeholder = () => {
  return ReactDOM.createPortal(
    <div
      style={{
        zIndex: 2000,
        backgroundColor: "#455a64",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh"
      }}
    >
      <FontAwesomeIcon
        icon={faSun}
        size="lg"
        spin
        style={{
          color: "#5e7a88",
          fontSize: "8rem",
          position: "fixed",
          top: "50%",
          left: "50%",
          marginRight: "-50%",
          transform: "translate(-50%, -50%)"
        }}
      />
    </div>,
    document.body
  );
};

const Theme = observer(({ settingsStore }) => (
  <React.Suspense fallback={<Placeholder />}>
    {settingsStore.themeConfig.config.darkTheme ? (
      <DarkTheme />
    ) : (
      <LightTheme />
    )}
  </React.Suspense>
));

const ThemeContext = React.createContext();

export { Theme, ThemeContext };

import React, { useEffect } from "react";
import ReactDOM from "react-dom";

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
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <FontAwesomeIcon
        icon={faSun}
        size="lg"
        spin
        style={{
          color: "#5e7a88",
          fontSize: "14rem",
        }}
      />
    </div>,
    document.body
  );
};

interface ThemeCtx {
  isDark: boolean;
  reactSelectStyles: any;
  animations: {
    duration: number;
  };
}

const ThemeContext = React.createContext({
  isDark: false,
  reactSelectStyles: {},
  animations: { duration: 1000 },
} as ThemeCtx);

const BodyTheme = () => {
  const context = React.useContext(ThemeContext);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", context.isDark);
    document.body.classList.toggle("theme-light", !context.isDark);
  }, [context.isDark]);

  return (
    <React.Suspense fallback={<Placeholder />}>
      {context.isDark ? <DarkTheme /> : <LightTheme />}
    </React.Suspense>
  );
};

export { BodyTheme, ThemeContext };

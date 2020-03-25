import React, { Component } from "react";
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

const ThemeContext = React.createContext();

class BodyTheme extends Component {
  onToggleBodyClass = (isDark) => {
    document.body.classList.toggle("theme-dark", isDark);
    document.body.classList.toggle("theme-light", !isDark);
  };

  componentDidMount() {
    this.onToggleBodyClass(this.context.isDark);
  }

  componentDidUpdate() {
    this.onToggleBodyClass(this.context.isDark);
  }

  render() {
    return (
      <React.Suspense fallback={<Placeholder />}>
        {this.context.isDark ? <DarkTheme /> : <LightTheme />}
      </React.Suspense>
    );
  }
}
BodyTheme.contextType = ThemeContext;

export { BodyTheme, ThemeContext };

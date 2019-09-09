import React from "react";

import { storiesOf } from "@storybook/react";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { MainModalContent, TabNames } from "./MainModalContent";

import "App.scss";

storiesOf("MainModal", module)
  .addDecorator(storyFn => (
    <div className="overflow-auto modal d-block" role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("Configuration", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    return (
      <MainModalContent
        alertStore={alertStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        isVisible={true}
      />
    );
  })
  .add("Help", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    return (
      <MainModalContent
        alertStore={alertStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        isVisible={true}
        openTab={TabNames.Help}
      />
    );
  });

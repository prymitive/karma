import React from "react";

import { storiesOf } from "@storybook/react";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { MainModalContent } from "./MainModalContent";

import "App.scss";

storiesOf("MainModal", module)
  .addDecorator(storyFn => (
    <div className="modal d-block" role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("content", () => {
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
  });

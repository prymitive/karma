import React from "react";

import { storiesOf } from "@storybook/react";

import fetchMock from "fetch-mock";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { MainModalContent, TabNames } from "./MainModalContent";

import "Styles/Percy.scss";

storiesOf("MainModal", module)
  .addDecorator((storyFn) => (
    <div>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("Configuration", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();

    fetchMock.mock(
      "begin:/label",
      {
        status: 200,
        body: JSON.stringify([]),
        headers: { "Content-Type": "application/json" },
      },
      {
        overwriteRoutes: true,
      }
    );

    alertStore.info.authentication.enabled = true;
    alertStore.info.authentication.username = "me@example.com";
    return (
      <MainModalContent
        alertStore={alertStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        isVisible={true}
        expandAllOptions={true}
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
        expandAllOptions={true}
      />
    );
  });

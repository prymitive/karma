import React from "react";

import { storiesOf } from "@storybook/react";

import { MockGrid } from "__mocks__/Stories.js";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FatalError } from "./FatalError";
import { UpgradeNeeded } from "./UpgradeNeeded";
import { ReloadNeeded } from "./ReloadNeeded";
import { EmptyGrid } from "./EmptyGrid";
import { Grid } from ".";
import { InternalError } from "../../ErrorBoundary";

import "Styles/Percy.scss";

storiesOf("Grid", module)
  .add("InternalError", () => {
    return (
      <InternalError
        message="React error boundary message with a veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping"
        secondsLeft={45}
        progressLeft={66}
      />
    );
  })
  .add("FatalError", () => {
    return (
      <FatalError message="Something failed with a veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping" />
    );
  })
  .add("UpgradeNeeded", () => {
    return <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />;
  })
  .add("ReloadNeeded", () => {
    return <ReloadNeeded reloadAfter={100000000} />;
  })
  .add("EmptyGrid", () => {
    return (
      <div className="text-center">
        <EmptyGrid />
      </div>
    );
  })
  .add("AlertGrid", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    const silenceFormStore = new SilenceFormStore();

    MockGrid(alertStore);

    return (
      <Grid
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
      />
    );
  });

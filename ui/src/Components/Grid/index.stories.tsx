import { storiesOf } from "@storybook/react";

import fetchMock from "fetch-mock";

import { MockGrid } from "../../__fixtures__/Stories";
import {
  EmptyHistoryResponse,
  RainbowHistoryResponse,
  FailedHistoryResponse,
} from "../../__fixtures__/AlertHistory";
import { AlertStore } from "../../Stores/AlertStore";
import { Settings } from "../../Stores/Settings";
import { SilenceFormStore } from "../../Stores/SilenceFormStore";
import { FatalError } from "./FatalError";
import { UpgradeNeeded } from "./UpgradeNeeded";
import { ReloadNeeded } from "./ReloadNeeded";
import { EmptyGrid } from "./EmptyGrid";
import Grid from ".";
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
    const settingsStore = new Settings(null);
    const silenceFormStore = new SilenceFormStore();

    fetchMock
      .mock(
        {
          name: "group1",
          url: "/history.json",
          body: { labels: { group: "group1" } },
        },
        EmptyHistoryResponse,
        {
          matchPartialBody: true,
          overwriteRoutes: true,
        }
      )
      .mock(
        {
          name: "group2",
          url: "/history.json",
          body: { labels: { group: "group2" } },
        },
        RainbowHistoryResponse,
        {
          matchPartialBody: true,
          overwriteRoutes: true,
        }
      )
      .mock(
        {
          name: "group3",
          url: "/history.json",
          body: { labels: { group: "group3" } },
        },
        FailedHistoryResponse,
        {
          matchPartialBody: true,
          overwriteRoutes: true,
        }
      )
      .mock(
        {
          name: "group4",
          url: "/history.json",
          body: { labels: { group: "group4" } },
        },
        EmptyHistoryResponse,
        {
          delay: 30 * 1000,
          matchPartialBody: true,
          overwriteRoutes: true,
        }
      )
      .mock(
        {
          name: "any",
          url: "/history.json",
          body: { labels: { alertname: "Fake Alert" } },
        },
        EmptyHistoryResponse,
        {
          matchPartialBody: true,
          overwriteRoutes: true,
        }
      );

    MockGrid(alertStore);

    return (
      <Grid
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
      />
    );
  });

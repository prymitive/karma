import React from "react";

import { storiesOf } from "@storybook/react";

import moment from "moment";

import { MockAlert, MockAlertGroup } from "__mocks__/Alerts.js";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { FatalError } from "./FatalError";
import { UpgradeNeeded } from "./UpgradeNeeded";
import { Grid } from ".";

import "Percy.scss";

const MockGroup = (groupName, alertCount, active, suppressed, unprocessed) => {
  let alerts = [];
  for (let i = 1; i <= alertCount; i++) {
    let state;
    switch (true) {
      case i > active && i <= active + suppressed:
        state = "suppressed";
        break;
      case i > active + suppressed:
        state = "unprocessed";
        break;
      default:
        state = "active";
    }
    const alert = MockAlert(
      alertCount < 4
        ? [
            {
              name: "dashboard",
              value: "http://localhost",
              visible: true,
              isLink: true
            },
            {
              name: "help",
              value: "this is a summary text",
              visible: true,
              isLink: false
            },
            {
              name: "hidden",
              value: "this is hidden by default",
              visible: false,
              isLink: false
            }
          ]
        : [],
      { instance: `instance${i}` },
      state
    );
    alert.startsAt = moment()
      .subtract(alertCount, "minutes")
      .toISOString();
    alerts.push(alert);
  }
  const group = MockAlertGroup(
    { alertname: "Fake Alert", group: groupName },
    alerts,
    [],
    {},
    {}
  );
  return group;
};

storiesOf("Grid", module)
  .add("FatalError", () => {
    return (
      <FatalError message="Something failed with a veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping" />
    );
  })
  .add("UpgradeNeeded", () => {
    return <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />;
  })
  .add("AlertGrid", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    const silenceFormStore = new SilenceFormStore();

    alertStore.data.colors = {
      group: {
        group1: {
          brightness: 50,
          background: { red: 178, green: 55, blue: 247, alpha: 255 }
        },
        group2: {
          brightness: 50,
          background: { red: 200, green: 100, blue: 66, alpha: 255 }
        },
        group3: {
          brightness: 205,
          background: { red: 246, green: 176, blue: 247, alpha: 255 }
        },
        group4: {
          brightness: 111,
          background: { red: 115, green: 101, blue: 152, alpha: 255 }
        }
      },
      instance: {
        instance1: {
          brightness: 50,
          background: { red: 111, green: 65, blue: 40, alpha: 255 }
        },
        instance2: {
          brightness: 50,
          background: { red: 66, green: 99, blue: 66, alpha: 255 }
        },
        instance3: {
          brightness: 150,
          background: { red: 66, green: 250, blue: 123, alpha: 255 }
        }
      }
    };

    let groups = [];
    for (let i = 1; i <= 10; i++) {
      const active = Math.max(1, Math.ceil(i / 3));
      const suppressed = Math.max(0, i - 2 * Math.ceil(i / 3));
      const unprocessed = Math.max(0, i - active - suppressed);

      const id = `id${i}`;
      const hash = `hash${i}`;
      const group = MockGroup(`group${i}`, i, active, suppressed, unprocessed);
      group.id = id;
      group.hash = hash;
      group.stateCount.active = active;
      group.stateCount.suppressed = suppressed;
      group.stateCount.unprocessed = unprocessed;
      if (i < 3) {
        group.shared.labels = {
          cluster: `prod${i}`,
          job: "textfile_exporter"
        };
      }
      if (i < 5) {
        group.shared.annotations = [
          {
            name: "summary",
            value: "Only 5% free space left on /disk",
            visible: true,
            isLink: false
          }
        ];
      }
      groups.push(group);
    }
    alertStore.data.upstreams = {
      counters: { total: 3, healthy: 1, failed: 2 },
      instances: [
        { name: "am1", uri: "http://localhost:9093", error: "" },
        {
          name: "am2",
          uri: "http://localhost:9094",
          error: "Failed to connect to http://localhost:9094"
        },
        {
          name: "failed",
          uri: "https://am.example.com",
          error:
            "Failed to connect to https://am.example.com veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping"
        }
      ],
      clusters: { am: ["am1", "am2"], failed: ["failed"] }
    };
    alertStore.data.groups = groups;

    return (
      <Grid
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
      />
    );
  });

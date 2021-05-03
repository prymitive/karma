import subMinutes from "date-fns/subMinutes";

import { AlertStateT, APIAlertGroupT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { MockAlert, MockAlertGroup, MockSilence } from "./Alerts";

const MockGroup = (
  groupName: string,
  alertCount: number,
  active: number,
  suppressed: number
): APIAlertGroupT => {
  const alerts = [];
  for (let i = 1; i <= alertCount; i++) {
    let state: AlertStateT;
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
              isLink: true,
              isAction: false,
            },
            {
              name: "help",
              value: "this is a summary text",
              visible: true,
              isLink: false,
              isAction: false,
            },
            {
              name: "hidden",
              value: "this is hidden by default",
              visible: false,
              isLink: false,
              isAction: false,
            },
            {
              name: "linkify",
              value:
                "annotation with a link to github.com/prymitive/karma project page",
              visible: true,
              isLink: false,
              isAction: false,
            },
            {
              name: "action",
              value: "http://localhost",
              visible: true,
              isLink: true,
              isAction: true,
            },
          ]
        : [],
      { instance: `instance${i}` },
      state
    );
    alert.startsAt = subMinutes(new Date(), alertCount).toISOString();
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

const MockGrid = (alertStore: AlertStore): void => {
  alertStore.settings.setValues({
    ...alertStore.settings.values,
    ...{
      alertAcknowledgement: {
        ...alertStore.settings.values.alertAcknowledgement,
        enabled: true,
      },
    },
  });
  alertStore.data.setReceivers(["by-cluster-service", "by-name"]);

  const silence = MockSilence();
  silence.startsAt = "2018-08-14T12:00:00Z";
  silence.endsAt = "2018-08-14T18:00:00Z";
  alertStore.data.setSilences({ prod: { [silence.id]: silence } });

  alertStore.data.setColors({
    group: {
      group1: {
        brightness: 50,
        background: "rgba(178,55,247,255)",
      },
      group2: {
        brightness: 50,
        background: "rgba(200,100,66,255)",
      },
      group3: {
        brightness: 205,
        background: "rgba(246,176,247,255)",
      },
      group4: {
        brightness: 111,
        background: "rgba(115,101,152,255)",
      },
    },
    instance: {
      instance1: {
        brightness: 50,
        background: "rgba(111,65,40,255)",
      },
      instance2: {
        brightness: 50,
        background: "rgba(66,99,66,255)",
      },
      instance3: {
        brightness: 150,
        background: "rgba(66,250,123,255)",
      },
    },
  });

  alertStore.data.setCounters([
    {
      name: "@receiver",
      hits: 2,
      values: [
        {
          value: "by-cluster-service",
          raw: "@receiver=by-cluster-service",
          hits: 2,
          percent: 100,
          offset: 0,
        },
      ],
    },
    {
      name: "alertname",
      hits: 90,
      values: [
        {
          value: "Fake Alert",
          raw: "alertname=Fake Alert",
          hits: 45,
          percent: 50,
          offset: 0,
        },
        {
          value: "Second Fake Alert",
          raw: "alertname=Second Fake Alert",
          hits: 45,
          percent: 50,
          offset: 50,
        },
      ],
    },
    {
      name: "group",
      hits: 100,
      values: [
        {
          value: "group1",
          raw: "group=group1",
          hits: 25,
          percent: 25,
          offset: 0,
        },
        {
          value: "group2",
          raw: "group=group2",
          hits: 70,
          percent: 70,
          offset: 25,
        },
        {
          value: "group3",
          raw: "group=group3",
          hits: 4,
          percent: 4,
          offset: 95,
        },
        {
          value: "group4",
          raw: "group=group4",
          hits: 1,
          percent: 1,
          offset: 99,
        },
      ],
    },
  ]);

  const groups = [];
  for (let i = 1; i <= 10; i++) {
    const active = Math.max(1, Math.ceil(i / 3));
    const suppressed = Math.max(0, i - 2 * Math.ceil(i / 3));
    const unprocessed = Math.max(0, i - active - suppressed);

    const id = `id${i}`;
    const group = MockGroup(`group${i}`, i, active, suppressed);

    for (let j = 0; j < group.alerts.length; j++) {
      if (group.alerts[j].state === "suppressed") {
        group.alerts[j].alertmanager = [
          {
            fingerprint: `fp-${i}-${j}`,
            name: "prod1",
            cluster: "prod",
            state: "suppressed",
            startsAt: "2018-08-14T17:36:40.017867056Z",
            source: "http://localhost/graph",
            silencedBy: [
              j < 2 ? "'Fake Silence ID / Should be fallback'" : silence.id,
            ],
            inhibitedBy: [],
          },
        ];
      }
    }

    group.id = id;
    group.stateCount.active = active;
    group.stateCount.suppressed = suppressed;
    group.stateCount.unprocessed = unprocessed;
    if (i < 3) {
      group.shared.labels = {
        cluster: `prod${i}`,
        job: "textfile_exporter",
      };
    }
    if (i < 5) {
      group.shared.annotations = [
        {
          name: "summary",
          value: "Only 5% free space left on /disk",
          visible: true,
          isLink: false,
          isAction: false,
        },
      ];
    }
    groups.push(group);
  }
  alertStore.data.setUpstreams({
    counters: { total: 3, healthy: 1, failed: 2 },
    instances: [
      {
        name: "prod1",
        cluster: "prod",
        clusterMembers: ["prod1", "prod2"],
        uri: "http://localhost:9093",
        publicURI: "http://localhost:9093",
        error: "",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        version: "0.21.0",
      },
      {
        name: "prod2",
        cluster: "prod",
        clusterMembers: ["prod1", "prod2"],
        uri: "http://localhost:9094",
        publicURI: "http://localhost:9094",
        error: "Failed to connect to http://localhost:9094",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        version: "",
      },
      {
        name: "dev",
        cluster: "dev",
        clusterMembers: ["dev"],
        uri: "https://am.example.com",
        publicURI: "https://am.example.com",
        error:
          "Failed to connect to https://am.example.com veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        version: "",
      },
    ],
    clusters: { prod: ["prod1", "prod2"], dev: ["dev"] },
  });
  alertStore.data.setGrids([
    {
      labelName: "cluster",
      labelValue: "prod",
      alertGroups: groups.slice(0, 7),
      stateCount: {
        unprocessed: 1,
        suppressed: 2,
        active: 3,
      },
    },
    {
      labelName: "cluster",
      labelValue: "",
      alertGroups: groups.slice(7, 11),
      stateCount: {
        unprocessed: 0,
        suppressed: 10,
        active: 99,
      },
    },
  ]);
};

export { MockGrid, MockGroup };

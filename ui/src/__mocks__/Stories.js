import moment from "moment";

import { MockAlert, MockAlertGroup, MockSilence } from "./Alerts.js";

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
              isLink: true,
            },
            {
              name: "help",
              value: "this is a summary text",
              visible: true,
              isLink: false,
            },
            {
              name: "hidden",
              value: "this is hidden by default",
              visible: false,
              isLink: false,
            },
            {
              name: "linkify",
              value:
                "annotation with a link to github.com/prymitive/karma project page",
              visible: true,
              isLink: false,
            },
          ]
        : [],
      { instance: `instance${i}` },
      state
    );
    alert.startsAt = moment().subtract(alertCount, "minutes").toISOString();
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

const MockGrid = (alertStore) => {
  alertStore.settings.values.alertAcknowledgement.enabled = true;

  const silence = MockSilence();
  silence.startsAt = "2018-08-14T12:00:00Z";
  silence.endsAt = "2018-08-14T18:00:00Z";
  alertStore.data.silences = { am: {} };
  alertStore.data.silences["am"][silence.id] = silence;

  alertStore.data.colors = {
    group: {
      group1: {
        brightness: 50,
        background: { red: 178, green: 55, blue: 247, alpha: 255 },
      },
      group2: {
        brightness: 50,
        background: { red: 200, green: 100, blue: 66, alpha: 255 },
      },
      group3: {
        brightness: 205,
        background: { red: 246, green: 176, blue: 247, alpha: 255 },
      },
      group4: {
        brightness: 111,
        background: { red: 115, green: 101, blue: 152, alpha: 255 },
      },
    },
    instance: {
      instance1: {
        brightness: 50,
        background: { red: 111, green: 65, blue: 40, alpha: 255 },
      },
      instance2: {
        brightness: 50,
        background: { red: 66, green: 99, blue: 66, alpha: 255 },
      },
      instance3: {
        brightness: 150,
        background: { red: 66, green: 250, blue: 123, alpha: 255 },
      },
    },
  };

  alertStore.data.counters = [
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
  ];

  let groups = [];
  for (let i = 1; i <= 10; i++) {
    const active = Math.max(1, Math.ceil(i / 3));
    const suppressed = Math.max(0, i - 2 * Math.ceil(i / 3));
    const unprocessed = Math.max(0, i - active - suppressed);

    const id = `id${i}`;
    const group = MockGroup(`group${i}`, i, active, suppressed, unprocessed);

    for (let j = 0; j < group.alerts.length; j++) {
      if (group.alerts[j].state === "suppressed") {
        group.alerts[j].alertmanager = [
          {
            name: "am1",
            cluster: "am",
            state: "suppressed",
            startsAt: "2018-08-14T17:36:40.017867056Z",
            source: "localhost/prometheus",
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
        },
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
        error: "Failed to connect to http://localhost:9094",
      },
      {
        name: "failed",
        uri: "https://am.example.com",
        error:
          "Failed to connect to https://am.example.com veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping",
      },
    ],
    clusters: { am: ["am1", "am2"], failed: ["failed"] },
  };
  alertStore.data.grids = [
    {
      labelName: "",
      labelValue: "",
      alertGroups: groups,
    },
  ];
};

export { MockGrid };

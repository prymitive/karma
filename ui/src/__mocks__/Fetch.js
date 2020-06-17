import { MockAlert, MockAlertGroup, MockSilence } from "./Alerts";

const EmptyAPIResponse = () => ({
  status: "success",
  timestamp: new Date().toISOString(),
  version: "fakeVersion",
  upstreams: {
    counters: { total: 1, healthy: 1, failed: 0 },
    instances: [{ name: "default", uri: "file:///mock", error: "" }],
  },
  silences: { default: {} },
  grids: [],
  receivers: ["by-cluster-service", "by-name"],
  totalAlerts: 0,
  colors: {},
  filters: [
    {
      text: "label=value",
      name: "label",
      matcher: "=",
      value: "value",
      hits: 0,
      isValid: true,
    },
  ],
  counters: {},
  settings: {
    sorting: {
      grid: {
        order: "startsAt",
        reverse: false,
        label: "alertname",
      },
      valueMapping: {
        cluster: {
          dev: 3,
          prod: 1,
          staging: 2,
        },
        severity: {
          critical: 1,
          info: 3,
          warning: 2,
        },
      },
    },
    silenceForm: {
      strip: {
        labels: [],
      },
    },
    alertAcknowledgement: {
      enabled: false,
      durationSeconds: 900,
      author: "karma / author missing",
      commentPrefix: "",
    },
    staticColorLabels: ["job"],
    annotationsDefaultHidden: false,
    annotationsHidden: [],
    annotationsVisible: [],
  },
});

const MockAPIResponse = () => {
  const response = EmptyAPIResponse();
  response.grids = [
    {
      labelName: "",
      labelValue: "",
      alertGroups: [
        MockAlertGroup(
          { alertname: "foo" },
          [MockAlert([], { instance: "foo" }, "suppressed")],
          [],
          { cluster: "dev" },
          {}
        ),
      ],
      stateCount: {
        unprocessed: 1,
        suppressed: 2,
        active: 3,
      },
    },
  ];
  response.totalAlerts = 25;
  return response;
};

const MockSilenceResponse = (cluster, count) => {
  let silences = [];
  for (var index = 1; index <= count; index++) {
    const silence = MockSilence();
    silence.id = `silence${index}`;
    silences.push({
      cluster: cluster,
      alertCount: 123,
      isExpired: index < 3,
      silence: silence,
    });
  }
  return silences;
};

export { EmptyAPIResponse, MockAPIResponse, MockSilenceResponse };

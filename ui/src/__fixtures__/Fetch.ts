import { MockAlert, MockAlertGroup, MockSilence } from "__fixtures__/Alerts";
import type { APIAlertsResponseT, APIManagedSilenceT } from "Models/APITypes";

const EmptyAPIResponse = (): APIAlertsResponseT => ({
  status: "success",
  error: "",
  timestamp: new Date().toISOString(),
  version: "fakeVersion",
  upstreams: {
    counters: { total: 1, healthy: 1, failed: 0 },
    clusters: { default: ["default"] },
    instances: [
      {
        name: "default",
        cluster: "default",
        clusterMembers: ["default"],
        uri: "http://localhost",
        publicURI: "http://localhost",
        error: "",
        version: "0.24.0",
        readonly: false,
        corsCredentials: "include",
        headers: {},
      },
    ],
  },
  silences: { default: {} },
  grids: [],
  labelNames: ["alertname", "job", "cluster"],
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
      defaultAlertmanagers: [],
    },
    alertAcknowledgement: {
      enabled: false,
      durationSeconds: 900,
      author: "karma / author missing",
      comment: "ACK! Mock comment",
    },
    annotationsDefaultHidden: false,
    annotationsHidden: [],
    annotationsVisible: [],
    annotationsEnableHTML: false,
    historyEnabled: true,
    gridGroupLimit: 40,
    labels: {
      job: { isStatic: true, isValueOnly: false },
    },
  },
  authentication: {
    username: "",
    enabled: false,
  },
});

const MockAPIResponse = (): APIAlertsResponseT => {
  const response = EmptyAPIResponse();
  response.grids = [
    {
      labelName: "",
      labelValue: "",
      alertGroups: [
        MockAlertGroup(
          [
            {
              name: "alertname",
              value: "foo",
            },
          ],
          [
            MockAlert(
              [],
              [
                {
                  name: "instance",
                  value: "foo",
                },
              ],
              "suppressed",
            ),
          ],
          [],
          [
            {
              name: "cluster",
              value: "dev",
            },
          ],
          {},
        ),
      ],
      totalGroups: 1,
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

const MockSilenceResponse = (
  cluster: string,
  count: number,
): APIManagedSilenceT[] => {
  const silences: APIManagedSilenceT[] = [];
  for (let index = 1; index <= count; index++) {
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

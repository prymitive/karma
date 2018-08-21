import moment from "moment";

const FetchMock = data =>
  jest.fn().mockImplementation(() =>
    Promise.resolve({
      json: () => data
    })
  );

const EmptyAPIResponse = () => ({
  status: "success",
  timestamp: moment().toISOString(),
  version: "fakeVersion",
  upstreams: {
    counters: { total: 1, healthy: 1, failed: 0 },
    instances: [{ name: "default", uri: "file:///mock", error: "" }]
  },
  silences: { default: {} },
  groups: {},
  totalAlerts: 0,
  colors: {},
  filters: [
    {
      text: "label=value",
      name: "label",
      matcher: "=",
      value: "value",
      hits: 0,
      isValid: true
    }
  ],
  counters: {},
  settings: {
    staticColorLabels: ["job"],
    annotationsDefaultHidden: false,
    annotationsHidden: [],
    annotationsVisible: []
  }
});

export { FetchMock, EmptyAPIResponse };

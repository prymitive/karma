const MockAnnotation = (name, value, visible, isLink) => ({
  name: name,
  value: value,
  visible: visible,
  isLink: isLink,
});

const MockAlert = (annotations, labels, state) => ({
  id: Math.random().toString(36),
  annotations: annotations,
  labels: labels,
  startsAt: "2018-08-14T17:36:40.017867056Z",
  state: state,
  alertmanager: [
    {
      name: "default",
      cluster: "default",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "localhost/prometheus",
      silencedBy: [],
      inhibitedBy: [],
    },
  ],
  receiver: "by-name",
});

const MockAlertGroup = (
  rootLabels,
  alerts,
  sharedAnnotations,
  sharedLabels,
  sharedSilences
) => ({
  receiver: "by-name",
  labels: rootLabels,
  alerts: alerts,
  id: "099c5ca6d1c92f615b13056b935d0c8dee70f18c",
  alertmanagerCount: {
    default: 1,
  },
  stateCount: {
    active: 1,
    suppressed: 0,
    unprocessed: 0,
  },
  shared: {
    annotations: sharedAnnotations,
    labels: sharedLabels,
    silences: sharedSilences,
  },
});

const MockSilence = () => ({
  comment: "Mocked Silence",
  createdAt: "0001-01-01T00:00:00Z",
  createdBy: "me@example.com",
  startsAt: "2000-01-01T00:00:00Z",
  endsAt: "2000-01-01T01:00:00Z",
  id: "04d37636-2350-4878-b382-e0b50353230f",
  ticketID: "",
  ticketURL: "",
  matchers: [
    { name: "foo", value: "bar", isRegex: false },
    { name: "baz", value: "regex", isRegex: true },
  ],
});

const MockAlertmanager = () => ({
  name: "default",
  cluster: "default",
  uri: "http://localhost",
  publicURI: "http://am.example.com",
  readonly: false,
  headers: {
    Authorization: "Basic foo bar",
  },
  corsCredentials: "include",
  error: "",
  version: "0.17.0",
  clusterMembers: ["default"],
});

export {
  MockAnnotation,
  MockAlert,
  MockAlertGroup,
  MockSilence,
  MockAlertmanager,
};

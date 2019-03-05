const MockAnnotation = (name, value, visible, isLink) => ({
  name: name,
  value: value,
  visible: visible,
  isLink: isLink
});

const MockAlert = (annotations, labels, state) => ({
  annotations: annotations,
  labels: labels,
  startsAt: "2018-08-14T17:36:40.017867056Z",
  endsAt: "0001-01-01T00:00:00Z",
  state: state,
  alertmanager: [
    {
      name: "default",
      cluster: "default",
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      endsAt: "0001-01-01T00:00:00Z",
      source: "localhost/prometheus",
      silencedBy: [],
      inhibitedBy: []
    }
  ],
  receiver: "by-name"
});

const MockAlertGroup = (
  rootLabels,
  alerts,
  sharedAnnotations,
  sharedLabels
) => ({
  receiver: "by-name",
  labels: rootLabels,
  alerts: alerts,
  id: "099c5ca6d1c92f615b13056b935d0c8dee70f18c",
  hash: "53a4bb3d7e916450b3bda550976f9578db5b2ad3",
  alertmanagerCount: {
    default: 1
  },
  stateCount: {
    active: 1,
    suppressed: 0,
    unprocessed: 0
  },
  shared: {
    annotations: sharedAnnotations,
    labels: sharedLabels
  }
});

const MockSilence = () => ({
  comment: "Mocked Silence",
  createdAt: "0001-01-01T00:00:00Z",
  createdBy: "me@example.com",
  startsAt: "2000-01-01T00:00:00Z",
  endsAt: "2000-01-01T01:00:00Z",
  id: "04d37636-2350-4878-b382-e0b50353230f",
  jiraID: "",
  jiraURL: "",
  matchers: [
    { name: "foo", value: "bar", isRegex: false },
    { name: "baz", value: "regex", isRegex: true }
  ]
});

const MockAlertmanager = () => ({
  name: "default",
  cluster: "default",
  uri: "http://localhost",
  publicURI: "http://am.example.com",
  error: "",
  version: "0.15.0",
  clusterMembers: ["default"]
});

export {
  MockAnnotation,
  MockAlert,
  MockAlertGroup,
  MockSilence,
  MockAlertmanager
};

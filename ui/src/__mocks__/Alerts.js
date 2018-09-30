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
      state: "active",
      startsAt: "2018-08-14T17:36:40.017867056Z",
      endsAt: "0001-01-01T00:00:00Z",
      source: "localhost/prometheus",
      silencedBy: []
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

export { MockAnnotation, MockAlert, MockAlertGroup };

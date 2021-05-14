import {
  APIAlertmanagerUpstreamT,
  APIAlertGroupT,
  APIAlertT,
  APISilenceT,
  APIAnnotationT,
  AlertStateT,
  LabelsT,
} from "Models/APITypes";

const MockAnnotation = (
  name: string,
  value: string,
  visible: boolean,
  isLink: boolean,
  isAction: boolean
): APIAnnotationT => ({
  name: name,
  value: value,
  visible: visible,
  isLink: isLink,
  isAction: isAction,
});

const MockAlert = (
  annotations: APIAnnotationT[],
  labels: LabelsT,
  state: AlertStateT
): APIAlertT => ({
  id: Math.random().toString(36),
  annotations: annotations,
  labels: labels,
  startsAt: "2018-08-14T17:36:40.017867056Z",
  state: state,
  alertmanager: [
    {
      fingerprint: "1234567",
      name: "default",
      cluster: "default",
      state: state,
      startsAt: "2018-08-14T17:36:40.017867056Z",
      source: "localhost/graph",
      silencedBy: [],
      inhibitedBy: [],
    },
  ],
  receiver: "by-name",
});

const MockAlertGroup = (
  rootLabels: LabelsT,
  alerts: APIAlertT[],
  sharedAnnotations: APIAnnotationT[],
  sharedLabels: LabelsT,
  sharedSilences: { [cluster: string]: string[] }
): APIAlertGroupT => ({
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

const MockSilence = (): APISilenceT => ({
  comment: "Mocked Silence",
  createdAt: "0001-01-01T00:00:00Z",
  createdBy: "me@example.com",
  startsAt: "2000-01-01T00:00:00Z",
  endsAt: "2000-01-01T01:00:00Z",
  id: "04d37636-2350-4878-b382-e0b50353230f",
  ticketID: "",
  ticketURL: "",
  matchers: [
    { name: "regex", value: "equal", isRegex: true, isEqual: true },
    { name: "regex", value: "notEqual", isRegex: true, isEqual: false },
    { name: "notRegex", value: "equal", isRegex: false, isEqual: true },
    { name: "notRegex", value: "notEqual", isRegex: false, isEqual: false },
  ],
});

const MockAlertmanager = (): APIAlertmanagerUpstreamT => ({
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

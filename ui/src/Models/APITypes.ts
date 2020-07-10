export type AlertStateT = "unprocessed" | "active" | "suppressed";

export type LabelsT = { [key: string]: string };

export interface AlertmanagerSilenceMatcherT {
  name: string;
  value: string;
  isRegex: boolean;
}

export interface AlertmanagerSilencePayloadT {
  id?: string;
  matchers: AlertmanagerSilenceMatcherT[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
}

export interface APIAnnotationT {
  name: string;
  value: string;
  visible: boolean;
  isLink: boolean;
}

export interface APIAlertmanagerStateT {
  fingerprint: string;
  name: string;
  cluster: string;
  state: AlertStateT;
  startsAt: string;
  source: string;
  silencedBy: string[];
  inhibitedBy: string[];
}

export interface APIAlertT {
  id: string;
  annotations: APIAnnotationT[];
  labels: LabelsT;
  startsAt: string;
  state: AlertStateT;
  alertmanager: APIAlertmanagerStateT[];
  receiver: string;
}

export interface StateCountT {
  active: number;
  suppressed: number;
  unprocessed: number;
}

export interface APIAlertGroupT {
  id: string;
  receiver: string;
  labels: LabelsT;
  alerts: APIAlertT[];
  alertmanagerCount: { [key: string]: number };
  stateCount: StateCountT;
  shared: {
    annotations: APIAnnotationT[];
    labels: LabelsT;
    silences: { [cluster: string]: string[] };
  };
}

export interface APISilenceT {
  id: string;
  matchers: AlertmanagerSilenceMatcherT[];
  startsAt: string;
  endsAt: string;
  createdAt: string;
  createdBy: string;
  comment: string;
  ticketID: string;
  ticketURL: string;
}

export interface APIGridT {
  labelName: string;
  labelValue: string;
  alertGroups: APIAlertGroupT[];
  stateCount: StateCountT;
}

export interface APIAlertmanagerUpstreamT {
  name: string;
  cluster: string;
  uri: string;
  publicURI: string;
  readonly: boolean;
  headers: { [key: string]: string };
  corsCredentials: "omit" | "same-origin" | "include";
  error: string;
  version: string;
  clusterMembers: string[];
}

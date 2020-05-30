import PropTypes from "prop-types";

const AlertState = PropTypes.oneOf(["unprocessed", "active", "suppressed"]);

const Annotation = PropTypes.exact({
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  visible: PropTypes.bool.isRequired,
  isLink: PropTypes.bool.isRequired,
});

const APIAlertAlertmanagerState = PropTypes.exact({
  name: PropTypes.string.isRequired,
  cluster: PropTypes.string.isRequired,
  state: AlertState.isRequired,
  startsAt: PropTypes.string.isRequired,
  source: PropTypes.string.isRequired,
  silencedBy: PropTypes.arrayOf(PropTypes.string).isRequired,
  inhibitedBy: PropTypes.arrayOf(PropTypes.string).isRequired,
});

const APIAlert = PropTypes.exact({
  id: PropTypes.string.isRequired,
  annotations: PropTypes.arrayOf(Annotation).isRequired,
  labels: PropTypes.object.isRequired,
  startsAt: PropTypes.string.isRequired,
  state: AlertState.isRequired,
  alertmanager: PropTypes.arrayOf(APIAlertAlertmanagerState).isRequired,
  receiver: PropTypes.string.isRequired,
});

const APIStateCount = PropTypes.exact({
  active: PropTypes.number.isRequired,
  suppressed: PropTypes.number.isRequired,
  unprocessed: PropTypes.number.isRequired,
});

const APIGroup = PropTypes.exact({
  receiver: PropTypes.string.isRequired,
  labels: PropTypes.object.isRequired,
  alerts: PropTypes.arrayOf(APIAlert),
  id: PropTypes.string.isRequired,
  alertmanagerCount: PropTypes.objectOf(PropTypes.number).isRequired,
  stateCount: APIStateCount.isRequired,
  shared: PropTypes.exact({
    annotations: PropTypes.arrayOf(Annotation).isRequired,
    labels: PropTypes.object.isRequired,
    silences: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string))
      .isRequired,
  }).isRequired,
});

const APISilenceMatcher = PropTypes.exact({
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  isRegex: PropTypes.bool.isRequired,
});

const APISilence = PropTypes.exact({
  id: PropTypes.string.isRequired,
  matchers: PropTypes.arrayOf(APISilenceMatcher).isRequired,
  startsAt: PropTypes.string.isRequired,
  endsAt: PropTypes.string.isRequired,
  createdAt: PropTypes.string.isRequired,
  createdBy: PropTypes.string.isRequired,
  comment: PropTypes.string.isRequired,
  ticketID: PropTypes.string.isRequired,
  ticketURL: PropTypes.string.isRequired,
});

const APIAlertmanagerUpstream = PropTypes.exact({
  name: PropTypes.string.isRequired,
  cluster: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  publicURI: PropTypes.string.isRequired,
  readonly: PropTypes.bool.isRequired,
  headers: PropTypes.object.isRequired,
  corsCredentials: PropTypes.oneOf(["omit", "same-origin", "include"])
    .isRequired,
  error: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  clusterMembers: PropTypes.arrayOf(PropTypes.string).isRequired,
});

const APIGrid = PropTypes.exact({
  labelName: PropTypes.string.isRequired,
  labelValue: PropTypes.string.isRequired,
  alertGroups: PropTypes.arrayOf(APIGroup).isRequired,
  stateCount: APIStateCount.isRequired,
});

export {
  APIAlert,
  APIGroup,
  APISilence,
  APISilenceMatcher,
  APIAlertAlertmanagerState,
  APIAlertmanagerUpstream,
  APIGrid,
};

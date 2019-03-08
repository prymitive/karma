import PropTypes from "prop-types";

const AlertState = PropTypes.oneOf(["unprocessed", "active", "suppressed"]);

const Annotation = PropTypes.exact({
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  visible: PropTypes.bool.isRequired,
  isLink: PropTypes.bool.isRequired
});

const APIAlertAlertmanagerState = PropTypes.exact({
  name: PropTypes.string.isRequired,
  cluster: PropTypes.string.isRequired,
  state: AlertState.isRequired,
  startsAt: PropTypes.string.isRequired,
  endsAt: PropTypes.string.isRequired,
  source: PropTypes.string.isRequired,
  silencedBy: PropTypes.arrayOf(PropTypes.string).isRequired,
  inhibitedBy: PropTypes.arrayOf(PropTypes.string).isRequired
});

const APIAlert = PropTypes.exact({
  annotations: PropTypes.arrayOf(Annotation).isRequired,
  labels: PropTypes.object.isRequired,
  startsAt: PropTypes.string.isRequired,
  endsAt: PropTypes.string.isRequired,
  state: AlertState.isRequired,
  alertmanager: PropTypes.arrayOf(APIAlertAlertmanagerState).isRequired,
  receiver: PropTypes.string.isRequired
});

const APIGroup = PropTypes.exact({
  receiver: PropTypes.string.isRequired,
  labels: PropTypes.object.isRequired,
  alerts: PropTypes.arrayOf(APIAlert),
  id: PropTypes.string.isRequired,
  hash: PropTypes.string.isRequired,
  alertmanagerCount: PropTypes.objectOf(PropTypes.number).isRequired,
  stateCount: PropTypes.exact({
    active: PropTypes.number.isRequired,
    suppressed: PropTypes.number.isRequired,
    unprocessed: PropTypes.number.isRequired
  }),
  shared: PropTypes.exact({
    annotations: PropTypes.arrayOf(Annotation).isRequired,
    labels: PropTypes.object.isRequired,
    silences: PropTypes.object.isRequired
  }).isRequired
});

const APISilenceMatcher = PropTypes.exact({
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  isRegex: PropTypes.bool.isRequired
});

const APISilence = PropTypes.exact({
  id: PropTypes.string.isRequired,
  matchers: PropTypes.arrayOf(APISilenceMatcher).isRequired,
  startsAt: PropTypes.string.isRequired,
  endsAt: PropTypes.string.isRequired,
  createdAt: PropTypes.string.isRequired,
  createdBy: PropTypes.string.isRequired,
  comment: PropTypes.string.isRequired,
  jiraID: PropTypes.string.isRequired,
  jiraURL: PropTypes.string.isRequired
});

const APIAlertmanagerUpstream = PropTypes.exact({
  name: PropTypes.string.isRequired,
  cluster: PropTypes.string.isRequired,
  uri: PropTypes.string.isRequired,
  publicURI: PropTypes.string.isRequired,
  error: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  clusterMembers: PropTypes.arrayOf(PropTypes.string).isRequired
});

export {
  APIAlert,
  APIGroup,
  APISilence,
  APISilenceMatcher,
  APIAlertAlertmanagerState,
  APIAlertmanagerUpstream
};

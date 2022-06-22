const QueryOperators = Object.freeze({
  Equal: "=",
  NotEqual: "!=",
  Regex: "=~",
  NegativeRegex: "!~",
});

const StaticLabels = Object.freeze({
  AlertName: "alertname",
  AlertManager: "@alertmanager",
  AlertmanagerCluster: "@cluster",
  Fingerprint: "@fingerprint",
  Receiver: "@receiver",
  State: "@state",
  SilencedBy: "@silenced_by",
  Inhibited: "@inhibited",
  InhibitedBy: "@inhibited_by",
});

function FormatQuery(name: string, operator: string, value: string): string {
  return `${name}${operator}${value}`;
}

export { QueryOperators, StaticLabels, FormatQuery };

const QueryOperators = Object.freeze({
  Equal: "=",
  Regex: "=~"
});

const StaticLabels = Object.freeze({
  AlertName: "alertname",
  AlertManager: "@alertmanager",
  Receiver: "@receiver",
  State: "@state",
  SilenceID: "@silence_id"
});

function FormatQuery(name, operator, value) {
  return `${name}${operator}${value}`;
}

export { QueryOperators, StaticLabels, FormatQuery };

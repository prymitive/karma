const QueryOperators = Object.freeze({
  Equal: "="
});

const StaticLabels = Object.freeze({
  AlertName: "alertname",
  AlertManager: "@alertmanager",
  Receiver: "@receiver",
  State: "@state"
});

function FormatQuery(name, operator, value) {
  return `${name}${operator}${value}`;
}

export { QueryOperators, StaticLabels, FormatQuery };

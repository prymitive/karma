import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";

const MatcherToFilter = matcher => {
  const operator = matcher.isRegex
    ? QueryOperators.Regex
    : QueryOperators.Equal;
  const value =
    matcher.values.length > 1
      ? `(${matcher.values.map(v => v.value).join("|")})`
      : matcher.values[0].value;
  return FormatQuery(
    matcher.name,
    operator,
    matcher.isRegex ? `^${value}$` : value
  );
};

const AlertManagersToFilter = alertmanagers => {
  if (alertmanagers.length > 1) {
    return FormatQuery(
      StaticLabels.AlertManager,
      QueryOperators.Regex,
      `^(${alertmanagers.map(am => am.label).join("|")})$`
    );
  } else if (alertmanagers.length === 1) {
    return FormatQuery(
      StaticLabels.AlertManager,
      QueryOperators.Equal,
      alertmanagers[0].label
    );
  }
};

export { MatcherToFilter, AlertManagersToFilter };

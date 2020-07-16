import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import { MultiValueOptionT } from "Common/Select";
import { MatcherT } from "Stores/SilenceFormStore";

const MatcherToFilter = (matcher: MatcherT): string => {
  const operator = matcher.isRegex
    ? QueryOperators.Regex
    : QueryOperators.Equal;
  const value =
    matcher.values.length > 1
      ? `(${matcher.values.map((v) => v.value).join("|")})`
      : matcher.values[0].value;
  return FormatQuery(
    matcher.name,
    operator,
    matcher.isRegex ? `^${value}$` : value
  );
};

const AlertManagersToFilter = (alertmanagers: MultiValueOptionT[]): string => {
  let amNames: string[] = ([] as string[]).concat(
    ...alertmanagers.map((am) => am.value)
  );
  return FormatQuery(
    StaticLabels.AlertManager,
    QueryOperators.Regex,
    `^(${amNames.join("|")})$`
  );
};

export { MatcherToFilter, AlertManagersToFilter };

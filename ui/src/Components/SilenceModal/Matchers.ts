import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import { MultiValueOptionT } from "Common/Select";
import { MatcherT, MatcherToOperator } from "Stores/SilenceFormStore";

const MatcherToFilter = (matcher: MatcherT): string => {
  const value =
    matcher.values.length > 1
      ? `(${matcher.values.map((v) => v.value).join("|")})`
      : matcher.values[0].value;
  return FormatQuery(
    matcher.name,
    MatcherToOperator(matcher),
    matcher.isRegex ? `^${value}$` : value
  );
};

const AlertManagersToFilter = (alertmanagers: MultiValueOptionT[]): string => {
  const amNames: string[] = ([] as string[]).concat(
    ...alertmanagers.map((am) => am.value)
  );
  return FormatQuery(
    StaticLabels.AlertManager,
    QueryOperators.Regex,
    `^(${amNames.join("|")})$`
  );
};

export { MatcherToFilter, AlertManagersToFilter };

import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import type { MultiValueOptionT } from "Common/Select";
import {
  MatcherT,
  MatcherToOperator,
  EscapeRegex,
} from "Stores/SilenceFormStore";

const MatcherToFilter = (matcher: MatcherT): string => {
  const values = matcher.values.map((v) =>
    v.wasCreated
      ? v
      : matcher.isRegex
        ? { ...v, value: EscapeRegex(v.value) }
        : v,
  );
  const value =
    values.length > 1
      ? `(${values.map((v) => v.value).join("|")})`
      : values[0].value;
  return FormatQuery(
    matcher.name,
    MatcherToOperator(matcher),
    matcher.isRegex ? `^${value}$` : value,
  );
};

const AlertManagersToFilter = (alertmanagers: MultiValueOptionT[]): string => {
  const amNames: string[] = ([] as string[]).concat(
    ...alertmanagers.map((am) => am.value),
  );
  return FormatQuery(
    StaticLabels.AlertManager,
    QueryOperators.Regex,
    `^(${amNames.join("|")})$`,
  );
};

export { MatcherToFilter, AlertManagersToFilter };

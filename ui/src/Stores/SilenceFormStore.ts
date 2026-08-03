import { makeAutoObservable, actionBound } from "mobx";

import { parseISO } from "date-fns/parseISO";
import { addHours } from "date-fns/addHours";
import { addMinutes } from "date-fns/addMinutes";
import { subMinutes } from "date-fns/subMinutes";
import { differenceInDays } from "date-fns/differenceInDays";
import { differenceInHours } from "date-fns/differenceInHours";
import { differenceInMinutes } from "date-fns/differenceInMinutes";

import type {
  APIAlertT,
  APIAlertGroupT,
  APIAlertmanagerUpstreamT,
  AlertmanagerSilencePayloadT,
  AlertmanagerSilenceMatcherT,
  ReadOnly,
} from "Models/APITypes";
import { StringToOption, OptionT, MultiValueOptionT } from "Common/Select";
import { QueryOperators } from "Common/Query";

let idCounter = 0;
const uniqueId = (): string => String(++idCounter);

export interface MatcherT {
  name: string;
  values: OptionT[];
  isEqual: boolean;
  isRegex: boolean;
}

export interface MatcherWithIDT extends MatcherT {
  id: string;
}

interface SimplifiedMatcherT {
  n: string;
  v: string[];
  r: boolean;
  e: boolean;
}

interface SilenceFormDataFromBase64 {
  am: MultiValueOptionT[];
  m: SimplifiedMatcherT[];
  d: number;
  c: string;
}

const NewEmptyMatcher = (): MatcherWithIDT => {
  return {
    id: uniqueId(),
    name: "",
    values: [],
    isRegex: false,
    isEqual: true,
  };
};

const MatcherToOperator = (
  matcher: MatcherT | MatcherWithIDT | AlertmanagerSilenceMatcherT,
): string => {
  if (matcher.isRegex) {
    return matcher.isEqual === false
      ? QueryOperators.NegativeRegex
      : QueryOperators.Regex;
  }
  return matcher.isEqual === false
    ? QueryOperators.NotEqual
    : QueryOperators.Equal;
};

const AlertmanagerClustersToOption = (clusterDict: {
  [key: string]: ReadOnly<string[]>;
}): MultiValueOptionT[] =>
  Object.entries(clusterDict).map(([clusterID, clusterMembers]) => ({
    label:
      clusterMembers.length > 1 ? `Cluster: ${clusterID}` : clusterMembers[0],
    value: [...clusterMembers],
  }));

export const EscapeRegex = (v: string): string => {
  return v.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

const UnescapeRegex = (v: string): string => {
  return v.replaceAll("\\", "");
};

const MatchersFromGroup = (
  group: ReadOnly<APIAlertGroupT>,
  stripLabels: ReadOnly<string[]>,
  onlyActive?: boolean,
): MatcherWithIDT[] => {
  const matchers: MatcherWithIDT[] = [];

  const allLabels: { [key: string]: string[] } = {};
  for (const [state, labels] of Object.entries(group.allLabels)) {
    if (onlyActive === true && state !== "active") {
      continue;
    }
    for (const [key, values] of Object.entries(labels).filter(
      ([key, _]) => !stripLabels.includes(key),
    )) {
      allLabels[key] = Array.from(
        new Set([...(allLabels[key] || []), ...values]),
      );
    }
  }
  for (const [key, values] of Object.entries(allLabels)) {
    matchers.push({
      id: uniqueId(),
      name: key,
      values: values.map((value) => StringToOption(value)),
      isRegex: values.length > 1,
      isEqual: true,
    });
  }

  return matchers;
};

const MatchersFromAlerts = (
  group: ReadOnly<APIAlertGroupT>,
  stripLabels: ReadOnly<string[]>,
  alerts: ReadOnly<APIAlertT[]>,
): MatcherWithIDT[] => {
  const matchers: MatcherWithIDT[] = [];

  // add matchers for all shared labels in this group
  for (const [key, value] of Object.entries(
    // eslint-disable-next-line @eslint-react/purity -- false positive: called from MobX action, not from render
    Object.assign(
      {},
      Object.fromEntries(group.labels.map((l) => [l.name, l.value])),
      Object.fromEntries(group.shared.labels.map((l) => [l.name, l.value])),
    ),
  )) {
    if (!stripLabels.includes(key)) {
      const matcher = NewEmptyMatcher();
      matcher.name = key;
      matcher.values = [StringToOption(value)];
      matchers.push(matcher);
    }
  }

  // array of arrays with label keys for each alert
  const allLabelKeys = alerts
    .map((alert) => alert.labels.map((l) => l.name))
    .filter((a) => a.length > 0);

  // this is the list of label key that are shared across all alerts in the group
  // https://stackoverflow.com/a/34498210/1154047
  const sharedLabelKeys = allLabelKeys.length
    ? allLabelKeys.reduce(function (r, a) {
        const last: { [key: string]: number } = {};
        return r.filter(function (b) {
          const p = a.indexOf(b, last[b] || 0);
          if (~p) {
            last[b] = p + 1;
            return true;
          }
          return false;
        });
      })
    : [];

  // add matchers for all unique labels in this group
  const labels: { [key: string]: Set<string> } = {};
  for (const alert of alerts) {
    for (const label of alert.labels) {
      if (
        sharedLabelKeys.includes(label.name) &&
        !stripLabels.includes(label.name)
      ) {
        if (!labels[label.name]) {
          labels[label.name] = new Set();
        }
        labels[label.name].add(label.value);
      }
    }
  }
  for (const [key, values] of Object.entries(labels)) {
    matchers.push({
      id: uniqueId(),
      name: key,
      values: Array.from(values)
        .sort()
        .map((value) => StringToOption(value)),
      isRegex: values.size > 1,
      isEqual: true,
    });
  }

  return matchers;
};

export interface ClusterRequestT {
  cluster: string;
  members: string[];
  isDone: boolean;
  silenceID: undefined | string;
  silenceLink: undefined | string;
  error: null | string;
}

const NewClusterRequest = (
  cluster: string,
  members: string[],
): ClusterRequestT => ({
  cluster: cluster,
  members: members,
  isDone: false,
  silenceID: undefined,
  silenceLink: undefined,
  error: null,
});

const GenerateAlertmanagerSilenceData = (
  startsAt: Date,
  endsAt: Date,
  matchers: MatcherT[],
  author: string,
  comment: string,
  silenceID: string | null = null,
): AlertmanagerSilencePayloadT => {
  const payload: AlertmanagerSilencePayloadT = {
    matchers: matchers.map((m) => ({
      name: m.name,
      value:
        m.values.length > 1
          ? `(${m.values
              .map((v) =>
                v.wasCreated || !m.isRegex ? v.value : EscapeRegex(v.value),
              )
              .join("|")})`
          : m.values.length === 1
            ? m.values[0].wasCreated || !m.isRegex
              ? m.values[0].value
              : EscapeRegex(m.values[0].value)
            : "",
      isRegex: m.isRegex,
      isEqual: m.isEqual,
    })),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    createdBy: author,
    comment: comment,
  };
  if (silenceID !== null) {
    payload.id = silenceID;
  }
  return payload;
};

const UnpackRegexMatcherValues = (isRegex: boolean, value: string) => {
  let val: string = value;
  if (isRegex) {
    val = UnescapeRegex(val);
  }
  if (isRegex && val.match(/^\(([a-zA-Z0-9_\-. ]+\|)+[a-zA-Z0-9_\-. ]+\)$/)) {
    return val
      .slice(1, -1)
      .split("|")
      .map((v) => StringToOption(v));
  } else if (
    isRegex &&
    val.match(/^([a-zA-Z0-9_\-. ]+\|)+[a-zA-Z0-9_\-. ]+$/)
  ) {
    return val.split("|").map((v) => StringToOption(v));
  } else {
    return [{ ...StringToOption(val), wasCreated: true }];
  }
};

type SilenceFormTabT = "editor" | "browser";
type SilenceFormStageT = "form" | "preview" | "submit";

class SilenceFormStoreToggle {
  visible = false;
  blurred = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  toggle() {
    this.visible = !this.visible;
  }

  hide() {
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  setBlur(val: boolean) {
    this.blurred = val;
  }
}

class SilenceFormStoreTab {
  current: SilenceFormTabT = "editor";

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setTab(value: SilenceFormTabT) {
    this.current = value;
  }
}

interface DurationT {
  days: number;
  hours: number;
  minutes: number;
}

class SilenceFormStoreData {
  currentStage: SilenceFormStageT = "form";
  wasValidated = false;
  silenceID: null | undefined | string = null;
  alertmanagers: MultiValueOptionT[] = [];
  matchers: MatcherWithIDT[] = [];
  startsAt = new Date();
  endsAt = addHours(new Date(), 1);
  comment = "";
  author = "";
  requestsByCluster: { [key: string]: ClusterRequestT } = {};
  autofillMatchers = true;
  resetInputs = true;

  constructor() {
    makeAutoObservable(
      this,
      {
        // called from an autorun in AlertManagerInput, autoAction wouldn't
        // create an action context there and trip enforceActions
        setAlertmanagers: actionBound,
      },
      { autoBind: true, name: "Silence form store" },
    );
  }

  get toBase64() {
    const json = JSON.stringify({
      am: this.alertmanagers,
      m: this.matchers.map((m: MatcherWithIDT) => ({
        n: m.name,
        r: m.isRegex,
        e: m.isEqual,
        v: m.values.map((v) => v.value),
      })),
      d: differenceInMinutes(this.endsAt, this.startsAt),
      c: this.comment,
    });
    return window.btoa(json);
  }

  fromBase64(s: string): boolean {
    let parsed: SilenceFormDataFromBase64;
    try {
      parsed = JSON.parse(window.atob(s));
    } catch (error) {
      console.error(`Failed to parse JSON: ${error}`);
      return false;
    }

    const matchers: MatcherWithIDT[] = [];
    parsed.m.forEach((m: SimplifiedMatcherT) => {
      const matcher = NewEmptyMatcher();
      matcher.name = m.n;
      matcher.isRegex = m.r;
      matcher.isEqual = m.e;
      matcher.values = m.v.map((v) => StringToOption(v));
      matchers.push(matcher);
    });

    if (matchers.length > 0) {
      this.alertmanagers = parsed.am;
      this.matchers = matchers;

      this.startsAt = new Date();
      this.endsAt = addMinutes(this.startsAt, parsed.d);
      this.comment = parsed.c;

      this.silenceID = null;
      this.autofillMatchers = false;
      this.resetInputs = false;
      return true;
    }

    return false;
  }

  get isValid() {
    if (this.alertmanagers.length === 0) return false;
    if (this.matchers.length === 0) return false;
    if (
      this.matchers.filter(
        (m) =>
          m.name === "" ||
          m.values.length === 0 ||
          m.values.filter((v) => v.value === "").length > 0,
      ).length > 0
    )
      return false;
    if (this.comment === "") return false;
    if (this.author === "") return false;
    return true;
  }

  resetStartEnd() {
    this.startsAt = new Date();
    this.endsAt = addHours(new Date(), 1);
  }

  resetProgress() {
    this.currentStage = "form";
    this.wasValidated = false;
  }

  resetSilenceID() {
    this.silenceID = null;
  }

  setSilenceID(id: string | null) {
    this.silenceID = id;
  }

  setAlertmanagers(val: MultiValueOptionT[]) {
    this.alertmanagers = val;
  }

  setAutofillMatchers(v: boolean) {
    this.autofillMatchers = v;
  }

  setResetInputs(v: boolean) {
    this.resetInputs = v;
  }

  setStage(val: SilenceFormStageT) {
    this.currentStage = val;
  }

  setMatchers(m: MatcherWithIDT[]) {
    this.matchers = m;
  }

  // append a new empty matcher to the list
  addEmptyMatcher() {
    this.matchers.push(NewEmptyMatcher());
  }

  addMatcherWithID(m: MatcherWithIDT) {
    this.matchers.push(m);
  }

  deleteMatcher(id: string) {
    // only delete matchers if we have more than 1
    if (this.matchers.length > 1) {
      this.matchers = this.matchers.filter((m) => m.id !== id);
    }
  }

  // if alerts argument is not passed all group alerts will be used
  fillMatchersFromGroup(
    group: ReadOnly<APIAlertGroupT>,
    stripLabels: ReadOnly<string[]>,
    alertmanagers: MultiValueOptionT[],
    alerts?: ReadOnly<APIAlertT[]>,
  ) {
    this.alertmanagers = alertmanagers;

    this.matchers = alerts
      ? MatchersFromAlerts(group, stripLabels, alerts)
      : MatchersFromGroup(group, stripLabels);
    // ensure that silenceID is nulled, since it's used to edit silences
    // and this is used to silence groups
    this.silenceID = null;
    // disable matcher autofill
    this.autofillMatchers = false;
    // disable alertmanager input reset
    this.resetInputs = false;
  }

  fillFormFromSilence(
    alertmanager: ReadOnly<APIAlertmanagerUpstreamT>,
    silence: ReadOnly<AlertmanagerSilencePayloadT>,
  ) {
    this.silenceID = silence.id;

    this.alertmanagers = AlertmanagerClustersToOption({
      [alertmanager.cluster]: alertmanager.clusterMembers,
    });

    const matchers: MatcherWithIDT[] = [];
    for (const m of silence.matchers) {
      const matcher = NewEmptyMatcher();
      matcher.name = m.name;
      matcher.values = UnpackRegexMatcherValues(m.isRegex, m.value);
      matcher.isRegex = m.isRegex;
      matcher.isEqual = m.isEqual === false ? false : true;
      matchers.push(matcher);
    }
    this.matchers = matchers;

    this.startsAt = parseISO(silence.startsAt);
    this.endsAt = parseISO(silence.endsAt);
    this.comment = silence.comment;
    this.author = silence.createdBy;

    // disable matcher autofill
    this.autofillMatchers = false;
  }

  setAuthor(a: string) {
    this.author = a;
  }

  setComment(c: string) {
    this.comment = c;
  }

  verifyStarEnd() {
    const now = new Date();
    now.setSeconds(0);
    if (this.startsAt < now) {
      this.startsAt = now;
    }

    if (this.endsAt <= this.startsAt) {
      this.endsAt = addMinutes(this.startsAt, 1);
    }
  }

  setStart(startsAt: Date) {
    this.startsAt = startsAt;
  }

  setEnd(endsAt: Date) {
    this.endsAt = endsAt;
  }

  incStart(minutes: number) {
    this.startsAt = addMinutes(this.startsAt, minutes);
    this.verifyStarEnd();
  }

  decStart(minutes: number) {
    this.startsAt = subMinutes(this.startsAt, minutes);
    this.verifyStarEnd();
  }

  incEnd(minutes: number) {
    this.endsAt = addMinutes(this.endsAt, minutes);
    this.verifyStarEnd();
  }

  decEnd(minutes: number) {
    this.endsAt = subMinutes(this.endsAt, minutes);
    this.verifyStarEnd();
  }

  setWasValidated(v: boolean) {
    this.wasValidated = v;
  }

  setRequestsByCluster(val: { [key: string]: ClusterRequestT }) {
    this.requestsByCluster = val;
  }

  setRequestsByClusterUpdate(key: string, v: Partial<ClusterRequestT>) {
    this.requestsByCluster[key] = {
      ...this.requestsByCluster[key],
      ...v,
    };
  }

  get toAlertmanagerPayload() {
    const startsAt = new Date(this.startsAt);
    startsAt.setSeconds(0);
    startsAt.setMilliseconds(0);
    const endsAt = new Date(this.endsAt);
    endsAt.setSeconds(0);
    endsAt.setMilliseconds(0);
    return GenerateAlertmanagerSilenceData(
      startsAt,
      endsAt,
      this.matchers,
      this.author,
      this.comment,
      this.silenceID,
    );
  }

  get toDuration() {
    const data: DurationT = {
      days: differenceInDays(this.endsAt, this.startsAt),
      hours: differenceInHours(this.endsAt, this.startsAt) % 24,
      minutes: differenceInMinutes(this.endsAt, this.startsAt) % 60,
    };
    return data;
  }
}

class SilenceFormStore {
  toggle = new SilenceFormStoreToggle();
  tab = new SilenceFormStoreTab();

  // form data is stored here, it's global (rather than attached to the form)
  // so it can be manipulated from other parts of the code
  // example: when user clicks a silence button on alert we should populate
  // this form from that alert so user can easily silence that alert
  data = new SilenceFormStoreData();
}

export {
  SilenceFormStore,
  NewEmptyMatcher,
  AlertmanagerClustersToOption,
  MatchersFromGroup,
  GenerateAlertmanagerSilenceData,
  NewClusterRequest,
  MatcherToOperator,
};

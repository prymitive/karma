import { observable, action, computed } from "mobx";

import uniqueId from "lodash.uniqueid";

import parseISO from "date-fns/parseISO";
import addHours from "date-fns/addHours";
import addMinutes from "date-fns/addMinutes";
import subMinutes from "date-fns/subMinutes";
import differenceInDays from "date-fns/differenceInDays";
import differenceInHours from "date-fns/differenceInHours";
import differenceInMinutes from "date-fns/differenceInMinutes";

import {
  APIAlertT,
  APIAlertGroupT,
  APIAlertmanagerUpstreamT,
  AlertmanagerSilencePayloadT,
} from "Models/APITypes";

interface OptionT {
  label: string;
  value: string;
}

interface MultiValueOptionT {
  label: string;
  value: string[];
}

interface MatcherT {
  name: string;
  values: OptionT[];
  isRegex: boolean;
}

interface MatcherWithIDT extends MatcherT {
  id: string;
}

interface SimplifiedMatcherT {
  n: string;
  v: string[];
  r: boolean;
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
  };
};

const MatcherValueToObject = (value: string): OptionT => ({
  label: value,
  value: value,
});

const AlertmanagerClustersToOption = (clusterDict: {
  [key: string]: string[];
}): MultiValueOptionT[] =>
  Object.entries(clusterDict).map(([clusterID, clusterMembers]) => ({
    label:
      clusterMembers.length > 1 ? `Cluster: ${clusterID}` : clusterMembers[0],
    value: clusterMembers,
  }));

// FIXME delete
const SilenceFormStage = Object.freeze({
  UserInput: "form",
  Preview: "preview",
  Submit: "submit",
});

// FIXME delete
const SilenceTabNames = Object.freeze({
  Editor: "editor",
  Browser: "browser",
});

const MatchersFromGroup = (
  group: APIAlertGroupT,
  stripLabels: string[],
  alerts: APIAlertT[],
  onlyActive?: boolean
): MatcherWithIDT[] => {
  let matchers: MatcherWithIDT[] = [];

  // add matchers for all shared labels in this group
  for (const [key, value] of Object.entries(
    Object.assign({}, group.labels, group.shared.labels)
  )) {
    if (!stripLabels.includes(key)) {
      const matcher = NewEmptyMatcher();
      matcher.name = key;
      matcher.values = [MatcherValueToObject(value)];
      matchers.push(matcher);
    }
  }

  // this is the list of alerts we'll use to generate matchers
  const filteredAlerts = (alerts ? alerts : group.alerts).filter(
    (alert) => !onlyActive || alert.state === "active"
  );

  // array of arrays with label keys for each alert
  const allLabelKeys = filteredAlerts
    .map((alert) => Object.keys(alert.labels))
    .filter((a) => a.length > 0);

  // this is the list of label key that are shared across all alerts in the group
  // https://stackoverflow.com/a/34498210/1154047
  const sharedLabelKeys = allLabelKeys.length
    ? allLabelKeys.reduce(function (r, a) {
        var last: { [key: string]: number } = {};
        return r.filter(function (b) {
          var p = a.indexOf(b, last[b] || 0);
          if (~p) {
            last[b] = p + 1;
            return true;
          }
          return false;
        });
      })
    : [];

  // add matchers for all unique labels in this group
  let labels: { [key: string]: Set<string> } = {};
  for (const alert of filteredAlerts) {
    for (const [key, value] of Object.entries(alert.labels)) {
      if (sharedLabelKeys.includes(key) && !stripLabels.includes(key)) {
        if (!labels[key]) {
          labels[key] = new Set();
        }
        labels[key].add(value);
      }
    }
  }
  for (const [key, values] of Object.entries(labels)) {
    matchers.push({
      id: uniqueId(),
      name: key,
      values: Array.from(values)
        .sort()
        .map((value) => MatcherValueToObject(value)),
      isRegex: values.size > 1,
    });
  }

  return matchers;
};

const NewClusterRequest = (cluster: string, members: string[]) => ({
  cluster: cluster,
  members: members,
  isDone: false,
  silenceID: null,
  silenceLink: null,
  error: null,
});

const GenerateAlertmanagerSilenceData = (
  startsAt: Date,
  endsAt: Date,
  matchers: MatcherT[],
  author: string,
  comment: string,
  silenceID: string | null
): AlertmanagerSilencePayloadT => {
  const payload: AlertmanagerSilencePayloadT = {
    matchers: matchers.map((m) => ({
      name: m.name,
      value:
        m.values.length > 1
          ? `(${m.values.map((v) => v.value).join("|")})`
          : m.values.length === 1
          ? m.values[0].value
          : "",
      isRegex: m.isRegex,
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
  if (isRegex && value.match(/^\((\w+\|)+\w+\)$/)) {
    return value
      .slice(1, -1)
      .split("|")
      .map((v) => MatcherValueToObject(v));
  } else if (isRegex && value.match(/^(\w+\|)+\w+$/)) {
    return value.split("|").map((v) => MatcherValueToObject(v));
  } else {
    return [MatcherValueToObject(value)];
  }
};

interface ClusterRequestT {
  foo: boolean;
  // FIXME
}
class SilenceFormStore {
  toggle = observable(
    {
      visible: false,
      blurred: false,
      toggle() {
        this.visible = !this.visible;
      },
      hide() {
        this.visible = false;
      },
      show() {
        this.visible = true;
      },
      setBlur(val: boolean) {
        this.blurred = val;
      },
    },
    {
      toggle: action.bound,
      hide: action.bound,
      show: action.bound,
      setBlur: action.bound,
    }
  );

  tab = observable(
    {
      current: SilenceTabNames.Editor,
      setTab(value: "editor" | "browser") {
        this.current = value;
      },
    },
    {
      setTab: action.bound,
    }
  );

  // form data is stored here, it's global (rather than attached to the form)
  // so it can be manipulated from other parts of the code
  // example: when user clicks a silence button on alert we should populate
  // this form from that alert so user can easily silence that alert
  data = observable(
    {
      currentStage: SilenceFormStage.UserInput,
      wasValidated: false as boolean,
      silenceID: null as null | undefined | string,
      alertmanagers: [] as MultiValueOptionT[],
      matchers: [] as MatcherWithIDT[],
      startsAt: new Date(),
      endsAt: addHours(new Date(), 1),
      comment: "",
      author: "",
      requestsByCluster: {} as { [key: string]: ClusterRequestT },
      autofillMatchers: true as boolean,
      resetInputs: true as boolean,

      get toBase64() {
        const json = JSON.stringify({
          am: this.alertmanagers,
          m: this.matchers.map((m: MatcherWithIDT) => ({
            n: m.name,
            r: m.isRegex,
            v: m.values.map((v) => v.value),
          })),
          d: differenceInMinutes(this.endsAt, this.startsAt),
          c: this.comment,
        });
        return window.btoa(json);
      },

      fromBase64(s: string) {
        let parsed: SilenceFormDataFromBase64;
        try {
          parsed = JSON.parse(window.atob(s));
        } catch (error) {
          console.error(`Failed to parse JSON: ${error}`);
          return false;
        }

        let matchers: MatcherWithIDT[] = [];
        parsed.m.forEach((m: SimplifiedMatcherT) => {
          const matcher = NewEmptyMatcher();
          matcher.name = m.n;
          matcher.isRegex = m.r;
          matcher.values = m.v.map((v) => MatcherValueToObject(v));
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
      },

      get isValid() {
        if (this.alertmanagers.length === 0) return false;
        if (this.matchers.length === 0) return false;
        if (
          this.matchers.filter(
            (m) =>
              m.name === "" ||
              m.values.length === 0 ||
              m.values.filter((v) => v.value === "").length > 0
          ).length > 0
        )
          return false;
        if (this.comment === "") return false;
        if (this.author === "") return false;
        return true;
      },

      resetStartEnd() {
        this.startsAt = new Date();
        this.endsAt = addHours(new Date(), 1);
      },

      resetProgress() {
        this.currentStage = SilenceFormStage.UserInput;
        this.wasValidated = false;
      },

      resetSilenceID() {
        this.silenceID = null;
      },

      setAlertmanagers(val: MultiValueOptionT[]) {
        this.alertmanagers = val;
      },

      setStageSubmit() {
        this.currentStage = SilenceFormStage.Submit;
      },

      // append a new empty matcher to the list
      addEmptyMatcher() {
        this.matchers.push(NewEmptyMatcher());
      },

      deleteMatcher(id: string) {
        // only delete matchers if we have more than 1
        if (this.matchers.length > 1) {
          this.matchers = this.matchers.filter((m) => m.id !== id);
        }
      },

      // if alerts argument is not passed all group alerts will be used
      fillMatchersFromGroup(
        group: APIAlertGroupT,
        stripLabels: string[],
        alertmanagers: MultiValueOptionT[],
        alerts: APIAlertT[]
      ) {
        this.alertmanagers = alertmanagers;

        this.matchers = MatchersFromGroup(group, stripLabels, alerts);
        // ensure that silenceID is nulled, since it's used to edit silences
        // and this is used to silence groups
        this.silenceID = null;
        // disable matcher autofill
        this.autofillMatchers = false;
        // disable alertmanager input reset
        this.resetInputs = false;
      },

      fillFormFromSilence(
        alertmanager: APIAlertmanagerUpstreamT,
        silence: AlertmanagerSilencePayloadT
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
          matchers.push(matcher);
        }
        this.matchers = matchers;

        this.startsAt = parseISO(silence.startsAt);
        this.endsAt = parseISO(silence.endsAt);
        this.comment = silence.comment;
        this.author = silence.createdBy;

        // disable matcher autofill
        this.autofillMatchers = false;
      },

      verifyStarEnd() {
        const now = new Date();
        now.setSeconds(0);
        if (this.startsAt < now) {
          this.startsAt = now;
        }

        if (this.endsAt <= this.startsAt) {
          this.endsAt = addMinutes(this.startsAt, 1);
        }
      },
      incStart(minutes: number) {
        this.startsAt = addMinutes(this.startsAt, minutes);
        this.verifyStarEnd();
      },
      decStart(minutes: number) {
        this.startsAt = subMinutes(this.startsAt, minutes);
        this.verifyStarEnd();
      },

      incEnd(minutes: number) {
        this.endsAt = addMinutes(this.endsAt, minutes);
        this.verifyStarEnd();
      },
      decEnd(minutes: number) {
        this.endsAt = subMinutes(this.endsAt, minutes);
        this.verifyStarEnd();
      },

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
          this.silenceID
        );
      },

      get toDuration() {
        const data = {
          days: differenceInDays(this.endsAt, this.startsAt),
          hours: differenceInHours(this.endsAt, this.startsAt) % 24,
          minutes: differenceInMinutes(this.endsAt, this.startsAt) % 60,
        };
        return data;
      },
    },
    {
      toBase64: computed,
      fromBase64: action.bound,
      resetStartEnd: action.bound,
      resetProgress: action.bound,
      resetSilenceID: action.bound,
      setAlertmanagers: action.bound,
      setStageSubmit: action.bound,
      addEmptyMatcher: action.bound,
      deleteMatcher: action.bound,
      fillMatchersFromGroup: action.bound,
      fillFormFromSilence: action.bound,
      verifyStarEnd: action.bound,
      incStart: action.bound,
      decStart: action.bound,
      incEnd: action.bound,
      decEnd: action.bound,
      isValid: computed,
      toAlertmanagerPayload: computed,
      toDuration: computed,
    },
    { name: "Silence form store" }
  );
}

export {
  SilenceFormStore,
  SilenceFormStage,
  NewEmptyMatcher,
  MatcherValueToObject,
  AlertmanagerClustersToOption,
  SilenceTabNames,
  MatchersFromGroup,
  GenerateAlertmanagerSilenceData,
  NewClusterRequest,
};

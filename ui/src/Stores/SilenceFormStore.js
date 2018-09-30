import { observable, action, computed } from "mobx";

import uniqueId from "lodash.uniqueid";

import moment from "moment";

const NewEmptyMatcher = () => {
  return {
    id: uniqueId(),
    name: "",
    values: [],
    suggestions: {
      names: [],
      values: []
    },
    isRegex: false
  };
};

const MatcherValueToObject = value => ({ label: value, value: value });

class SilenceFormStore {
  // this is used to store modal visibility toggle
  toggle = observable(
    {
      visible: false,
      toggle() {
        this.visible = !this.visible;
      },
      hide() {
        this.visible = false;
      },
      show() {
        this.visible = true;
      }
    },
    { toggle: action.bound, hide: action.bound, show: action.bound }
  );

  // form data is stored here, it's global (rather than attached to the form)
  // so it can be manipulated from other parts of the code
  // example: when user clicks a silence button on alert we should populate
  // this form from that alert so user can easily silence that alert
  data = observable(
    {
      inProgress: false,
      wasValidated: false,
      silenceID: null,
      alertmanagers: [],
      matchers: [],
      startsAt: moment(),
      endsAt: moment().add(1, "hour"),
      comment: "",
      author: "",

      get isValid() {
        if (this.alertmanagers.length === 0) return false;
        if (this.matchers.length === 0) return false;
        if (
          this.matchers.filter(
            m =>
              m.name === "" ||
              m.values.length === 0 ||
              m.values.filter(v => v === "").length > 0
          ).length > 0
        )
          return false;
        if (this.comment === "") return false;
        if (this.author === "") return false;
        return true;
      },

      resetStartEnd() {
        this.startsAt = moment();
        this.endsAt = moment().add(1, "hour");
      },

      resetProgress() {
        this.inProgress = false;
        this.wasValidated = false;
      },

      resetSilenceID() {
        this.silenceID = null;
      },

      // append a new empty matcher to the list
      addEmptyMatcher() {
        let m = NewEmptyMatcher();
        this.matchers.push(m);
      },

      deleteMatcher(id) {
        // only delete matchers if we have more than 1
        if (this.matchers.length > 1) {
          this.matchers = this.matchers.filter(m => m.id !== id);
        }
      },

      // if alerts argument is not passed all group alerts will be used
      fillMatchersFromGroup(group, alerts) {
        let matchers = [];

        // add matchers for all shared labels in this group
        for (const [key, value] of Object.entries(
          Object.assign({}, group.labels, group.shared.labels)
        )) {
          const matcher = NewEmptyMatcher();
          matcher.name = key;
          matcher.values = [MatcherValueToObject(value)];
          matchers.push(matcher);
        }

        // add matchers for all unique labels in this group
        let labels = {};
        const allAlerts = alerts ? alerts : group.alerts;
        for (const alert of allAlerts) {
          for (const [key, value] of Object.entries(alert.labels)) {
            if (!labels[key]) {
              labels[key] = new Set();
            }
            labels[key].add(value);
          }
        }
        for (const [key, values] of Object.entries(labels)) {
          matchers.push({
            id: uniqueId(),
            name: key,
            values: [...values]
              .sort()
              .map(value => MatcherValueToObject(value)),
            suggestions: {
              names: [],
              values: []
            },
            isRegex: values.size > 1
          });
        }

        this.matchers = matchers;
      },

      fillFormFromSilence(alertmanager, silence) {
        this.silenceID = silence.id;
        this.alertmanagers = [
          {
            label: alertmanager.name,
            value: alertmanager.publicURI
          }
        ];

        const matchers = [];
        for (const m of silence.matchers) {
          const matcher = NewEmptyMatcher();
          matcher.name = m.name;
          matcher.values = [MatcherValueToObject(m.value)];
          matcher.isRegex = m.isRegex;
          matchers.push(matcher);
        }
        this.matchers = matchers;

        this.startsAt = moment(silence.startsAt);
        this.endsAt = moment(silence.endsAt);
        this.comment = silence.comment;
        this.author = silence.createdBy;
      },

      verifyStarEnd() {
        const now = moment().second(0);
        if (this.startsAt.isBefore(now)) {
          this.startsAt = now;
        }

        if (this.endsAt.isSameOrBefore(this.startsAt)) {
          this.endsAt = moment(this.startsAt).add(1, "minutes");
        }
      },
      incStart(minutes) {
        this.startsAt = moment(this.startsAt).add(minutes, "minutes");
        this.verifyStarEnd();
      },
      decStart(minutes) {
        this.startsAt = moment(this.startsAt).subtract(minutes, "minutes");
        this.verifyStarEnd();
      },

      incEnd(minutes) {
        this.endsAt = moment(this.endsAt).add(minutes, "minutes");
        this.verifyStarEnd();
      },
      decEnd(minutes) {
        this.endsAt = moment(this.endsAt).subtract(minutes, "minutes");
        this.verifyStarEnd();
      },

      get toAlertmanagerPayload() {
        const payload = {
          matchers: this.matchers.map(m => ({
            name: m.name,
            value:
              m.values.length > 1
                ? `(${m.values.map(v => v.value).join("|")})`
                : m.values.length === 1
                  ? m.values[0].value
                  : "",
            isRegex: m.isRegex
          })),
          startsAt: this.startsAt
            .second(0)
            .millisecond(0)
            .toISOString(),
          endsAt: this.endsAt
            .second(0)
            .millisecond(0)
            .toISOString(),
          createdBy: this.author,
          comment: this.comment
        };
        if (this.silenceID !== null) {
          payload.id = this.silenceID;
        }
        return payload;
      },

      get toDuration() {
        const data = {
          days: this.endsAt.diff(this.startsAt, "days"),
          hours: this.endsAt.diff(this.startsAt, "hours") % 24,
          minutes: this.endsAt.diff(this.startsAt, "minutes") % 60
        };
        return data;
      }
    },
    {
      resetStartEnd: action.bound,
      resetProgress: action.bound,
      resetSilenceID: action.bound,
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
      toDuration: computed
    },
    { name: "Silence form store" }
  );
}

export { SilenceFormStore, NewEmptyMatcher, MatcherValueToObject };

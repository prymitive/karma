import { observable, action, computed } from "mobx";

import uniqueId from "lodash.uniqueid";

import moment from "moment";

const NewEmptyMatcher = id => {
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

const ValueToObject = value => ({ label: value, value: value });

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
      alertmanagers: [],
      matchers: [],
      startsAt: moment(),
      endsAt: moment().add(1, "hour"),
      comment: "",
      author: "",
      resetProgress() {
        this.inProgress = false;
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
      fillMatchersFromGroup(group) {
        let matchers = [];

        // add matchers for all shared labels in this group
        for (const [key, value] of Object.entries(
          Object.assign({}, group.labels, group.shared.labels)
        )) {
          matchers.push({
            id: uniqueId(),
            name: key,
            values: [ValueToObject(value)],
            suggestions: {
              names: [],
              values: []
            },
            isRegex: false
          });
        }

        // add matchers for all unique labels in this group
        let labels = {};
        for (const alert of group.alerts) {
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
            values: [...values].sort().map(value => ValueToObject(value)),
            suggestions: {
              names: [],
              values: []
            },
            isRegex: values.size > 1
          });
        }

        this.matchers = matchers;
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
            .second(59)
            .millisecond(0)
            .toISOString(),
          createdBy: this.author,
          comment: this.comment
        };
        return payload;
      }
    },
    {
      resetProgress: action.bound,
      addEmptyMatcher: action.bound,
      deleteMatcher: action.bound,
      fillMatchersFromGroup: action.bound,
      toAlertmanagerPayload: computed
    },
    { name: "Silence form store" }
  );
}

export { SilenceFormStore };

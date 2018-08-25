import moment from "moment";

import { MockAlert, MockAlertGroup } from "__mocks__/Alerts.js";
import { SilenceFormStore } from "./SilenceFormStore";

let store;
beforeEach(() => {
  store = new SilenceFormStore();
});

describe("SilenceFormStore.toggle", () => {
  it("toggle() toggles 'visible' correctly", () => {
    expect(store.toggle.visible).toBe(false);
    store.toggle.toggle();
    expect(store.toggle.visible).toBe(true);
    store.toggle.toggle();
    expect(store.toggle.visible).toBe(false);
  });

  it("show() set 'visible' to true", () => {
    expect(store.toggle.visible).toBe(false);
    store.toggle.show();
    expect(store.toggle.visible).toBe(true);
  });

  it("hide() set 'visible' to false", () => {
    expect(store.toggle.visible).toBe(false);
    store.toggle.visible = true;
    expect(store.toggle.visible).toBe(true);
    store.toggle.hide();
    expect(store.toggle.visible).toBe(false);
  });
});

const MockGroup = () => {
  const alerts = [
    MockAlert([], { instance: "prod1", cluster: "prod" }),
    MockAlert([], { instance: "prod2", cluster: "prod" }),
    MockAlert([], { instance: "dev1", cluster: "dev" })
  ];
  const group = MockAlertGroup({ alertname: "FakeAlert" }, alerts, [], {
    job: "mock"
  });
  return group;
};

describe("SilenceFormStore.data", () => {
  it("resetProgress() sets 'inProgress' to false", () => {
    store.data.inProgress = true;
    expect(store.data.inProgress).toBe(true);
    store.data.resetProgress();
    expect(store.data.inProgress).toBe(false);
  });

  it("addEmptyMatcher() appends a matcher", () => {
    expect(store.data.matchers).toHaveLength(0);
    store.data.addEmptyMatcher();
    expect(store.data.matchers).toHaveLength(1);
  });

  it("deleteMatcher() removes a matcher with passed id", () => {
    store.data.addEmptyMatcher();
    store.data.addEmptyMatcher();
    store.data.addEmptyMatcher();
    const matcherID = store.data.matchers[1].id;
    store.data.deleteMatcher(matcherID);
    expect(store.data.matchers).toHaveLength(2);
    expect(store.data.matchers).not.toContainEqual(
      expect.objectContaining({ id: matcherID })
    );
  });

  it("fillMatchersFromGroup() creates correct matcher object for a group", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group);
    expect(store.data.matchers).toHaveLength(4);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert" }],
        isRegex: false
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "job",
        values: [{ label: "mock", value: "mock" }],
        isRegex: false
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [
          { label: "dev1", value: "dev1" },
          { label: "prod1", value: "prod1" },
          { label: "prod2", value: "prod2" }
        ],
        isRegex: true
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [
          { label: "dev", value: "dev" },
          { label: "prod", value: "prod" }
        ],
        isRegex: true
      })
    );
  });

  it("toAlertmanagerPayload creates payload that matches snapshot", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group);
    store.data.startsAt = moment([2000, 1, 1, 0, 0, 0]);
    store.data.endsAt = moment([2000, 1, 1, 1, 0, 0]);
    store.data.createdBy = "me@example.com";
    store.data.comment = "toAlertmanagerPayload test";
    expect(store.data.toAlertmanagerPayload).toMatchSnapshot();
  });
});

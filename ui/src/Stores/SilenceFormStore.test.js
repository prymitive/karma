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
    // add empty matcher so we test empty string rendering
    store.data.addEmptyMatcher();
    store.data.startsAt = moment([2000, 1, 1, 0, 0, 0]);
    store.data.endsAt = moment([2000, 1, 1, 1, 0, 0]);
    store.data.createdBy = "me@example.com";
    store.data.comment = "toAlertmanagerPayload test";
    expect(store.data.toAlertmanagerPayload).toMatchSnapshot();
  });
});

describe("SilenceFormStore.data startsAt & endsAt validation", () => {
  it("toDuration returns correct duration for 5d 0h 1m", () => {
    store.data.startsAt = moment([2000, 1, 1, 0, 0, 0]);
    store.data.endsAt = moment([2000, 1, 6, 0, 1, 15]);
    expect(store.data.toDuration).toMatchObject({
      days: 5,
      hours: 0,
      minutes: 1
    });
  });

  it("toDuration returns correct duration for 2h 15m", () => {
    store.data.startsAt = moment([2000, 1, 1, 0, 0, 0]);
    store.data.endsAt = moment([2000, 1, 1, 2, 15, 0]);
    expect(store.data.toDuration).toMatchObject({
      days: 0,
      hours: 2,
      minutes: 15
    });
  });

  it("toDuration returns correct duration for 59m", () => {
    store.data.startsAt = moment([2000, 1, 1, 0, 10, 0]);
    store.data.endsAt = moment([2000, 1, 1, 1, 9, 0]);
    expect(store.data.toDuration).toMatchObject({
      days: 0,
      hours: 0,
      minutes: 59
    });
  });

  it("verifyStarEnd() doesn't do anything if endsAt if after startsAt", () => {
    const startsAt = moment([2063, 1, 1, 0, 0, 0]);
    const endsAt = moment([2063, 1, 1, 1, 1, 0]);
    store.data.startsAt = startsAt;
    store.data.endsAt = endsAt;
    store.data.verifyStarEnd();
    expect(store.data.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(store.data.endsAt.toISOString()).toBe(endsAt.toISOString());
  });

  it("verifyStarEnd() updates startsAt if it's before now()", () => {
    const now = moment().second(0);
    const startsAt = moment([2000, 1, 1, 0, 0, 1]);
    const endsAt = moment([2063, 1, 1, 0, 0, 0]);
    store.data.startsAt = startsAt;
    store.data.endsAt = endsAt;
    store.data.verifyStarEnd();
    expect(store.data.startsAt.isSameOrAfter(now)).toBeTruthy();
    expect(store.data.endsAt.toISOString()).toBe(endsAt.toISOString());
  });

  it("verifyStarEnd() updates endsAt if it's before startsAt", () => {
    const startsAt = moment([2063, 1, 1, 0, 0, 1]);
    const endsAt = moment([2063, 1, 1, 0, 0, 0]);
    store.data.startsAt = startsAt;
    store.data.endsAt = endsAt;
    store.data.verifyStarEnd();
    expect(store.data.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(store.data.endsAt.toISOString()).toBe(
      moment([2063, 1, 1, 0, 1, 1]).toISOString()
    );
  });

  it("incStart(7) adds 7 minutes to startsAt", () => {
    const startsAt = moment([2063, 1, 1, 0, 0, 1]);
    store.data.startsAt = startsAt;
    store.data.incStart(7);
    const diffMS = store.data.startsAt.diff(startsAt);
    expect(diffMS).toBe(7 * 60 * 1000);
  });

  it("decStart(14) subtracts 14 minutes from startsAt", () => {
    const startsAt = moment([2063, 1, 1, 0, 0, 1]);
    store.data.startsAt = startsAt;
    store.data.decStart(14);
    const diffMS = store.data.startsAt.diff(startsAt);
    expect(diffMS).toBe(-14 * 60 * 1000);
  });

  it("incEnd(120) adds 120 minutes to endsAt", () => {
    const endsAt = moment([2063, 1, 1, 0, 0, 1]);
    store.data.endsAt = endsAt;
    store.data.incEnd(120);
    const diffMS = store.data.endsAt.diff(endsAt);
    expect(diffMS).toBe(120 * 60 * 1000);
  });

  it("decEnd(1) subtracts 1 minute from endsAt", () => {
    const endsAt = moment([2063, 1, 1, 0, 0, 1]);
    store.data.endsAt = endsAt;
    store.data.decEnd(1);
    const diffMS = store.data.endsAt.diff(endsAt);
    expect(diffMS).toBe(-1 * 60 * 1000);
  });
});

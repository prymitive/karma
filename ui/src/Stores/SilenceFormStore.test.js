import moment from "moment";

import {
  MockAlert,
  MockAlertGroup,
  MockSilence,
  MockAlertmanager
} from "__mocks__/Alerts.js";
import {
  SilenceFormStore,
  SilenceFormStage,
  NewEmptyMatcher
} from "./SilenceFormStore";

let store;
beforeEach(() => {
  store = new SilenceFormStore();
});

const MockGroup = () => {
  const alerts = [
    MockAlert([], { instance: "prod1", cluster: "prod" }),
    MockAlert([], { instance: "prod2", cluster: "prod" }),
    MockAlert([], { instance: "dev1", cluster: "dev" })
  ];
  const group = MockAlertGroup(
    { alertname: "FakeAlert" },
    alerts,
    [],
    {
      job: "mock"
    },
    {}
  );
  return group;
};

const MockAlertmanagerOption = () => ({
  label: "default",
  value: ["default"]
});

const MockMatcher = (name, values) => {
  const matcher = NewEmptyMatcher();
  matcher.name = name;
  matcher.values = values;
  return matcher;
};

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

describe("SilenceFormStore.data", () => {
  it("resetStartEnd() sets startsAt and endsAt to defaults", () => {
    store.data.startsAt = moment([2000, 1, 1, 0, 1, 0]);
    store.data.endsAt = moment([2000, 1, 1, 1, 2, 0]);
    expect(store.data.startsAt.isSame([2000, 1, 1], "day")).toBe(true);
    expect(store.data.endsAt.isSame([2000, 1, 1], "day")).toBe(true);
    store.data.resetStartEnd();
    expect(store.data.startsAt.isSame([2000, 1, 1], "day")).toBe(false);
    expect(store.data.endsAt.isSame([2000, 1, 1], "day")).toBe(false);
  });

  it("resetProgress() sets currentStage to UserInput", () => {
    store.data.currentStage = SilenceFormStage.Submit;
    store.data.resetProgress();
    expect(store.data.currentStage).toBe(SilenceFormStage.UserInput);
  });

  it("resetProgress() sets 'wasValidated' to false", () => {
    store.data.wasValidated = true;
    expect(store.data.wasValidated).toBe(true);
    store.data.resetProgress();
    expect(store.data.wasValidated).toBe(false);
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

  it("deleteMatcher() is a no-op when matcher list is empty", () => {
    store.data.deleteMatcher(1);
    expect(store.data.matchers).toHaveLength(0);
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

  it("fillMatchersFromGroup() creates correct matcher object for a group with only a subset of alets passed", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group, [group.alerts[0]]);
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
        values: [{ label: "prod1", value: "prod1" }],
        isRegex: false
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [{ label: "prod", value: "prod" }],
        isRegex: false
      })
    );
  });

  it("fillMatchersFromGroup() resets silenceID if set", () => {
    store.data.silenceID = "12345";
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group, [group.alerts[0]]);
    expect(store.data.silenceID).toBeNull();
  });

  it("fillFormFromSilence() sets silenceID", () => {
    const alertmanager = MockAlertmanager();
    const silence = MockSilence();
    store.data.fillFormFromSilence(alertmanager, silence);
    expect(store.data.silenceID).toBe(silence.id);
  });

  it("fillFormFromSilence() creates payload that matches silence data", () => {
    const alertmanager = MockAlertmanager();
    const silence = MockSilence();
    store.data.fillFormFromSilence(alertmanager, silence);

    expect(store.data.alertmanagers).toHaveLength(1);
    expect(store.data.alertmanagers[0]).toMatchObject({
      label: alertmanager.name,
      value: [alertmanager.name]
    });

    expect(store.data.matchers).toHaveLength(2);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "foo",
        values: [{ label: "bar", value: "bar" }],
        isRegex: false
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "baz",
        values: [{ label: "regex", value: "regex" }],
        isRegex: true
      })
    );

    expect(store.data.startsAt.utc().toISOString()).toBe(
      moment.utc([2000, 0, 1, 0, 0, 0]).toISOString()
    );
    expect(store.data.endsAt.utc().toISOString()).toBe(
      moment.utc([2000, 0, 1, 1, 0, 0]).toISOString()
    );

    expect(store.data.author).toBe("me@example.com");
    expect(store.data.comment).toBe("Mocked Silence");
  });

  it("toAlertmanagerPayload constains id when store.data.silenceID is set", () => {
    store.data.silenceID = "12345";
    expect(store.data.toAlertmanagerPayload).toMatchObject({
      id: "12345"
    });
  });

  it("toAlertmanagerPayload doesn't contain id when store.data.silenceID is null", () => {
    store.data.silenceID = null;
    expect(store.data.toAlertmanagerPayload.id).toBeUndefined();
  });

  it("toAlertmanagerPayload creates payload that matches snapshot", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group);
    // add empty matcher so we test empty string rendering
    store.data.addEmptyMatcher();
    store.data.startsAt = moment.utc([2000, 1, 1, 0, 0, 0]);
    store.data.endsAt = moment.utc([2000, 1, 1, 1, 0, 0]);
    store.data.author = "me@example.com";
    store.data.comment = "toAlertmanagerPayload test";
    expect(store.data.toAlertmanagerPayload).toMatchSnapshot();
  });
});

describe("SilenceFormStore.data.isValid", () => {
  it("isValid returns 'false' if alertmanagers list is empty", () => {
    store.data.matchers = [MockMatcher("foo", ["bar"])];
    store.data.author = "me@example.com";
    store.data.comment = "fake silence";
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is empty", () => {
    store.data.alertmanagers = [MockAlertmanagerOption];
    store.data.matchers = [];
    store.data.author = "me@example.com";
    store.data.comment = "fake silence";
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is pupulated when a matcher without any name", () => {
    store.data.alertmanagers = [MockAlertmanagerOption];
    store.data.matchers = [MockMatcher("", ["bar"])];
    store.data.author = "me@example.com";
    store.data.comment = "fake silence";
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is pupulated when a matcher without any value ([])", () => {
    store.data.alertmanagers = [MockAlertmanagerOption];
    store.data.matchers = [MockMatcher("foo", [])];
    store.data.author = "me@example.com";
    store.data.comment = "fake silence";
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is pupulated when a matcher with empty value ([''])", () => {
    store.data.alertmanagers = [MockAlertmanagerOption];
    store.data.matchers = [MockMatcher("foo", [])];
    store.data.author = "me@example.com";
    store.data.comment = "fake silence";
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if author is empty", () => {
    store.data.alertmanagers = [MockAlertmanagerOption];
    store.data.matchers = [MockMatcher("foo", ["bar"])];
    store.data.author = "";
    store.data.comment = "fake silence";
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if comment is empty", () => {
    store.data.alertmanagers = [MockAlertmanagerOption];
    store.data.matchers = [MockMatcher("foo", ["bar"])];
    store.data.author = "me@example.com";
    store.data.comment = "";
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'true' if all fileds are set", () => {
    store.data.alertmanagers = [MockAlertmanagerOption];
    store.data.matchers = [MockMatcher("foo", ["bar"])];
    store.data.author = "me@example.com";
    store.data.comment = "fake silence";
    expect(store.data.isValid).toBe(true);
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

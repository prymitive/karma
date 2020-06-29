import differenceInMinutes from "date-fns/differenceInMinutes";
import differenceInMilliseconds from "date-fns/differenceInMilliseconds";
import isSameDay from "date-fns/isSameDay";
import addHours from "date-fns/addHours";
import addMinutes from "date-fns/addMinutes";

import {
  MockAlert,
  MockAlertGroup,
  MockSilence,
  MockAlertmanager,
} from "__mocks__/Alerts.js";
import {
  SilenceFormStore,
  SilenceFormStage,
  NewEmptyMatcher,
  SilenceTabNames,
  MatcherValueToObject,
  AlertmanagerClustersToOption,
} from "./SilenceFormStore";

let store;
beforeEach(() => {
  store = new SilenceFormStore();
});

const MockGroup = () => {
  const alerts = [
    MockAlert([], { instance: "prod1", cluster: "prod" }),
    MockAlert([], { instance: "prod2", cluster: "prod" }),
    MockAlert([], { instance: "dev1", cluster: "dev" }),
  ];
  const group = MockAlertGroup(
    { alertname: "FakeAlert" },
    alerts,
    [],
    {
      job: "mock",
    },
    {}
  );
  return group;
};

const MockAlertmanagerOption = () => ({
  label: "default",
  value: ["default"],
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
    store.data.startsAt = new Date(2000, 1, 1, 0, 1, 0);
    store.data.endsAt = new Date(2000, 1, 1, 1, 2, 0);
    expect(isSameDay(store.data.startsAt, new Date(2000, 1, 1))).toBe(true);
    expect(isSameDay(store.data.endsAt, new Date(2000, 1, 1))).toBe(true);
    store.data.resetStartEnd();
    expect(isSameDay(store.data.startsAt, new Date(2000, 1, 1))).toBe(false);
    expect(isSameDay(store.data.endsAt, new Date(2000, 1, 1))).toBe(false);
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
    store.data.fillMatchersFromGroup(
      group,
      [],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] })
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(4);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert" }],
        isRegex: false,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "job",
        values: [{ label: "mock", value: "mock" }],
        isRegex: false,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [
          { label: "dev1", value: "dev1" },
          { label: "prod1", value: "prod1" },
          { label: "prod2", value: "prod2" },
        ],
        isRegex: true,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [
          { label: "dev", value: "dev" },
          { label: "prod", value: "prod" },
        ],
        isRegex: true,
      })
    );
  });

  it("fillMatchersFromGroup() creates correct matcher object for a group with only a subset of alerts passed", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(
      group,
      [],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] }),
      [group.alerts[0]]
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(4);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert" }],
        isRegex: false,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "job",
        values: [{ label: "mock", value: "mock" }],
        isRegex: false,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [{ label: "prod1", value: "prod1" }],
        isRegex: false,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [{ label: "prod", value: "prod" }],
        isRegex: false,
      })
    );
  });

  it("fillMatchersFromGroup() ignores labels from stripLabels list", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(
      group,
      ["job", "instance", "cluster"],
      [group.alerts[0]]
    );
    expect(store.data.matchers).toHaveLength(1);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert" }],
        isRegex: false,
      })
    );
  });

  it("fillMatchersFromGroup() handles alerts with different label sets", () => {
    const group = MockAlertGroup(
      { region: "AF" },
      [
        MockAlert([], {
          alertname: "Alert1",
          cluster: "prod",
          foo: "bar",
        }),
        MockAlert([], {
          alertname: "Alert2",
          instance: "prod2",
          cluster: "prod",
        }),
        MockAlert([], { alertname: "Alert3", instance: "dev1" }),
      ],
      [],
      {
        job: "mock",
      },
      {}
    );
    store.data.fillMatchersFromGroup(group, []);
    expect(store.data.matchers).toHaveLength(3);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "region",
        values: [{ label: "AF", value: "AF" }],
        isRegex: false,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [
          { label: "Alert1", value: "Alert1" },
          { label: "Alert2", value: "Alert2" },
          { label: "Alert3", value: "Alert3" },
        ],
        isRegex: true,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "job",
        values: [{ label: "mock", value: "mock" }],
        isRegex: false,
      })
    );
  });

  it("fillMatchersFromGroup() resets silenceID if set", () => {
    store.data.silenceID = "12345";
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group, [], [group.alerts[0]]);
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
      value: [alertmanager.name],
    });

    expect(store.data.matchers).toHaveLength(2);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "foo",
        values: [{ label: "bar", value: "bar" }],
        isRegex: false,
      })
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "baz",
        values: [{ label: "regex", value: "regex" }],
        isRegex: true,
      })
    );

    expect(store.data.startsAt.toISOString()).toBe(
      new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).toISOString()
    );
    expect(store.data.endsAt.toISOString()).toBe(
      new Date(Date.UTC(2000, 0, 1, 1, 0, 0)).toISOString()
    );

    expect(store.data.author).toBe("me@example.com");
    expect(store.data.comment).toBe("Mocked Silence");
  });

  const tests = [
    {
      matcher: { name: "foo", value: "(bar1|bar2|bar3)", isRegex: true },
      result: { name: "foo", values: ["bar1", "bar2", "bar3"] },
    },
    {
      matcher: { name: "foo", value: "(bar1|bar2|bar3)", isRegex: false },
      result: { name: "foo", values: ["(bar1|bar2|bar3)"] },
    },
    {
      matcher: { name: "foo", value: "bar1|bar2|bar3)", isRegex: false },
      result: { name: "foo", values: ["bar1|bar2|bar3)"] },
    },
    {
      matcher: { name: "foo", value: "(bar1|bar2|bar3", isRegex: false },
      result: { name: "foo", values: ["(bar1|bar2|bar3"] },
    },
    {
      matcher: { name: "foo", value: "bar1|bar2|bar3", isRegex: true },
      result: { name: "foo", values: ["bar1", "bar2", "bar3"] },
    },
    {
      matcher: { name: "foo", value: "bar1|bar2|bar3", isRegex: false },
      result: { name: "foo", values: ["bar1|bar2|bar3"] },
    },
    {
      matcher: { name: "foo", value: "(.+|bar2|bar3)", isRegex: true },
      result: { name: "foo", values: ["(.+|bar2|bar3)"] },
    },
    {
      matcher: { name: "foo", value: "bar1|bar?|bar3)", isRegex: true },
      result: { name: "foo", values: ["bar1|bar?|bar3)"] },
    },
    {
      matcher: { name: "foo", value: "server(0|1)", isRegex: true },
      result: { name: "foo", values: ["server(0|1)"] },
    },
  ];
  for (const t of tests) {
    it(`fillFormFromSilence() unpacks ${t.matcher.name}=${t.matcher.value} isRegex=${t.matcher.isRegex} into ${t.result.name}=${t.result.values}`, () => {
      const silenceFormStorestore = new SilenceFormStore();
      const alertmanager = MockAlertmanager();
      const silence = MockSilence();
      silence.matchers = [t.matcher];
      silenceFormStorestore.data.fillFormFromSilence(alertmanager, silence);

      expect(silenceFormStorestore.data.matchers).toHaveLength(1);
      expect(silenceFormStorestore.data.matchers).toContainEqual(
        expect.objectContaining({
          name: t.result.name,
          values: t.result.values.map((v) => ({ label: v, value: v })),
          isRegex: t.matcher.isRegex,
        })
      );
    });
  }

  it("toAlertmanagerPayload constains id when store.data.silenceID is set", () => {
    store.data.silenceID = "12345";
    expect(store.data.toAlertmanagerPayload).toMatchObject({
      id: "12345",
    });
  });

  it("toAlertmanagerPayload doesn't contain id when store.data.silenceID is null", () => {
    store.data.silenceID = null;
    expect(store.data.toAlertmanagerPayload.id).toBeUndefined();
  });

  it("toAlertmanagerPayload creates payload that matches snapshot", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group, []);
    // add empty matcher so we test empty string rendering
    store.data.addEmptyMatcher();
    store.data.startsAt = new Date(Date.UTC(2000, 1, 1, 0, 0, 0));
    store.data.endsAt = new Date(Date.UTC(2000, 1, 1, 1, 0, 0));
    store.data.author = "me@example.com";
    store.data.comment = "toAlertmanagerPayload test";
    expect(store.data.toAlertmanagerPayload).toMatchSnapshot();
  });

  it("dumps to base64 and back", () => {
    store.data.matchers = [
      MockMatcher("foo", [MatcherValueToObject("bar")]),
      MockMatcher("instance", [MatcherValueToObject("server0|server1")]),
      MockMatcher("cluster", [
        MatcherValueToObject("prod"),
        MatcherValueToObject("dev"),
      ]),
      MockMatcher("job", [MatcherValueToObject("abc.+")]),
    ];
    store.data.startsAt = new Date();
    store.data.endsAt = addMinutes(addHours(store.data.startsAt, 7), 45);
    store.data.comment = "base64";
    const b64 = store.data.toBase64;

    store.data.matchers = [];
    store.data.comment = "";

    store.data.fromBase64(b64);
    expect(store.data.matchers).toMatchObject([
      {
        isRegex: false,
        name: "foo",
        values: [MatcherValueToObject("bar")],
      },
      {
        isRegex: false,
        name: "instance",
        values: [MatcherValueToObject("server0|server1")],
      },
      {
        isRegex: false,
        name: "cluster",
        values: [MatcherValueToObject("prod"), MatcherValueToObject("dev")],
      },
      {
        isRegex: false,
        name: "job",
        values: [MatcherValueToObject("abc.+")],
      },
    ]);
    expect(store.data.comment).toBe("base64");
    expect(differenceInMinutes(store.data.endsAt, store.data.startsAt)).toBe(
      7 * 60 + 45
    );
  });

  it("base64 restore ignores empty matchers", () => {
    store.data.matchers = [];
    store.data.comment = "base64";
    const b64 = store.data.toBase64;

    store.data.matchers = [];
    store.data.comment = "foo";

    store.data.fromBase64(b64);
    expect(store.data.matchers).toMatchObject([]);
    expect(store.data.comment).toBe("foo");
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
    store.data.startsAt = new Date(2000, 1, 1, 0, 0, 0);
    store.data.endsAt = new Date(2000, 1, 6, 0, 1, 15);
    expect(store.data.toDuration).toMatchObject({
      days: 5,
      hours: 0,
      minutes: 1,
    });
  });

  it("toDuration returns correct duration for 2h 15m", () => {
    store.data.startsAt = new Date(2000, 1, 1, 0, 0, 0);
    store.data.endsAt = new Date(2000, 1, 1, 2, 15, 0);
    expect(store.data.toDuration).toMatchObject({
      days: 0,
      hours: 2,
      minutes: 15,
    });
  });

  it("toDuration returns correct duration for 59m", () => {
    store.data.startsAt = new Date(2000, 1, 1, 0, 10, 0);
    store.data.endsAt = new Date(2000, 1, 1, 1, 9, 0);
    expect(store.data.toDuration).toMatchObject({
      days: 0,
      hours: 0,
      minutes: 59,
    });
  });

  it("verifyStarEnd() doesn't do anything if endsAt if after startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 0);
    const endsAt = new Date(2063, 1, 1, 1, 1, 0);
    store.data.startsAt = startsAt;
    store.data.endsAt = endsAt;
    store.data.verifyStarEnd();
    expect(store.data.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(store.data.endsAt.toISOString()).toBe(endsAt.toISOString());
  });

  it("verifyStarEnd() updates startsAt if it's before now()", () => {
    const now = new Date();
    now.setSeconds(0);
    const startsAt = new Date(2000, 1, 1, 0, 0, 1);
    const endsAt = new Date(2063, 1, 1, 0, 0, 0);
    store.data.startsAt = startsAt;
    store.data.endsAt = endsAt;
    store.data.verifyStarEnd();
    expect(store.data.startsAt >= now).toBeTruthy();
    expect(store.data.endsAt.toISOString()).toBe(endsAt.toISOString());
  });

  it("verifyStarEnd() updates endsAt if it's before startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 1);
    const endsAt = new Date(2063, 1, 1, 0, 0, 0);
    store.data.startsAt = startsAt;
    store.data.endsAt = endsAt;
    store.data.verifyStarEnd();
    expect(store.data.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(store.data.endsAt.toISOString()).toBe(
      new Date(2063, 1, 1, 0, 1, 1).toISOString()
    );
  });

  it("incStart(7) adds 7 minutes to startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.startsAt = startsAt;
    store.data.incStart(7);
    const diffMS = differenceInMilliseconds(store.data.startsAt, startsAt);
    expect(diffMS).toBe(7 * 60 * 1000);
  });

  it("decStart(14) subtracts 14 minutes from startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.startsAt = startsAt;
    store.data.decStart(14);
    const diffMS = differenceInMilliseconds(store.data.startsAt, startsAt);
    expect(diffMS).toBe(-14 * 60 * 1000);
  });

  it("incEnd(120) adds 120 minutes to endsAt", () => {
    const endsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.endsAt = endsAt;
    store.data.incEnd(120);
    const diffMS = differenceInMilliseconds(store.data.endsAt, endsAt);
    expect(diffMS).toBe(120 * 60 * 1000);
  });

  it("decEnd(1) subtracts 1 minute from endsAt", () => {
    const endsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.endsAt = endsAt;
    store.data.decEnd(1);
    const diffMS = differenceInMilliseconds(store.data.endsAt, endsAt);
    expect(diffMS).toBe(-1 * 60 * 1000);
  });
});

describe("SilenceFormStore.tab", () => {
  it("current tab is Editor by default", () => {
    expect(store.tab.current).toBe(SilenceTabNames.Editor);
  });

  it("setTab() sets the current tab", () => {
    expect(store.tab.current).toBe(SilenceTabNames.Editor);
    store.tab.setTab(SilenceTabNames.Browser);
    expect(store.tab.current).toBe(SilenceTabNames.Browser);
  });
});

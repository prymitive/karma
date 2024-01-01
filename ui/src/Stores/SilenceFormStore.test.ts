import { differenceInMinutes } from "date-fns/differenceInMinutes";
import { differenceInMilliseconds } from "date-fns/differenceInMilliseconds";
import { isSameDay } from "date-fns/isSameDay";
import { addHours } from "date-fns/addHours";
import { addMinutes } from "date-fns/addMinutes";

import {
  MockAlert,
  MockAlertGroup,
  MockSilence,
  MockAlertmanager,
} from "__fixtures__/Alerts";
import { StringToOption, OptionT, MultiValueOptionT } from "Common/Select";
import {
  SilenceFormStore,
  NewEmptyMatcher,
  AlertmanagerClustersToOption,
} from "./SilenceFormStore";

let store: SilenceFormStore;

beforeEach(() => {
  store = new SilenceFormStore();
});

const MockGroup = () => {
  const alerts = [
    MockAlert(
      [],
      [
        { name: "instance", value: "prod1" },
        { name: "cluster", value: "prod" },
      ],
      "active",
    ),
    MockAlert(
      [],
      [
        { name: "instance", value: "prod2" },
        { name: "cluster", value: "prod" },
      ],
      "active",
    ),
    MockAlert(
      [],
      [
        { name: "instance", value: "dev1" },
        { name: "cluster", value: "dev" },
      ],
      "active",
    ),
  ];
  const group = MockAlertGroup(
    [{ name: "alertname", value: "FakeAlert" }],
    alerts,
    [],
    [
      {
        name: "job",
        value: "mock",
      },
    ],
    {},
  );
  return group;
};

const MockAlertmanagerOption = (): MultiValueOptionT => ({
  label: "default",
  value: ["default"],
});

const MockMatcher = (name: string, values: OptionT[]) => {
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
    store.toggle.show();
    expect(store.toggle.visible).toBe(true);
    store.toggle.hide();
    expect(store.toggle.visible).toBe(false);
  });
});

describe("SilenceFormStore.data", () => {
  it("resetStartEnd() sets startsAt and endsAt to defaults", () => {
    store.data.setStart(new Date(2000, 1, 1, 0, 1, 0));
    store.data.setEnd(new Date(2000, 1, 1, 1, 2, 0));
    expect(isSameDay(store.data.startsAt, new Date(2000, 1, 1))).toBe(true);
    expect(isSameDay(store.data.endsAt, new Date(2000, 1, 1))).toBe(true);
    store.data.resetStartEnd();
    expect(isSameDay(store.data.startsAt, new Date(2000, 1, 1))).toBe(false);
    expect(isSameDay(store.data.endsAt, new Date(2000, 1, 1))).toBe(false);
  });

  it("resetProgress() sets currentStage to UserInput", () => {
    store.data.setStage("submit");
    store.data.resetProgress();
    expect(store.data.currentStage).toBe("form");
  });

  it("resetProgress() sets 'wasValidated' to false", () => {
    store.data.setWasValidated(true);
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
      expect.objectContaining({ id: matcherID }),
    );
  });

  it("deleteMatcher() is a no-op when matcher list is empty", () => {
    store.data.deleteMatcher("1");
    expect(store.data.matchers).toHaveLength(0);
  });

  it("fillMatchersFromGroup() creates correct matcher object for a group", () => {
    const group = MockGroup();
    group.allLabels.active = {
      alertname: ["FakeAlert"],
      job: ["mock"],
      instance: ["dev1", "prod1", "prod2"],
      cluster: ["dev", "prod"],
    };
    group.allLabels.suppressed = {
      alertname: ["FakeAlert"],
      job: ["mock"],
      instance: ["dev2", "dev3", "dev4"],
      cluster: ["dev"],
    };
    store.data.fillMatchersFromGroup(
      group,
      [],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] }),
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(4);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "job",
        values: [{ label: "mock", value: "mock", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [
          { label: "dev1", value: "dev1", wasCreated: false },
          { label: "prod1", value: "prod1", wasCreated: false },
          { label: "prod2", value: "prod2", wasCreated: false },
          { label: "dev2", value: "dev2", wasCreated: false },
          { label: "dev3", value: "dev3", wasCreated: false },
          { label: "dev4", value: "dev4", wasCreated: false },
        ],
        isRegex: true,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [
          { label: "dev", value: "dev", wasCreated: false },
          { label: "prod", value: "prod", wasCreated: false },
        ],
        isRegex: true,
      }),
    );
  });

  it("fillMatchersFromGroup() creates correct matcher object for a list of alerts", () => {
    const group = MockGroup();
    group.allLabels.active = {
      alertname: ["FakeAlert"],
      job: ["mock"],
      instance: ["dev1", "prod1", "prod2"],
      cluster: ["dev", "prod"],
    };
    store.data.fillMatchersFromGroup(
      group,
      ["job"],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] }),
      group.alerts.slice(0, 2),
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(3);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [
          { label: "prod1", value: "prod1", wasCreated: false },
          { label: "prod2", value: "prod2", wasCreated: false },
        ],
        isRegex: true,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [{ label: "prod", value: "prod", wasCreated: false }],
        isRegex: false,
      }),
    );
  });

  it("fillMatchersFromGroup() creates correct matcher object for a list of alerts with common labels", () => {
    const group = MockGroup();
    group.allLabels.active = {
      alertname: ["FakeAlert"],
      job: ["mock"],
      instance: ["dev1", "prod1", "prod2"],
      cluster: ["dev", "prod"],
    };

    store.data.fillMatchersFromGroup(
      group,
      ["job"],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] }),
      [group.alerts[0], group.alerts[2]],
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(3);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [
          { label: "dev1", value: "dev1", wasCreated: false },
          { label: "prod1", value: "prod1", wasCreated: false },
        ],
        isRegex: true,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [
          { label: "dev", value: "dev", wasCreated: false },
          { label: "prod", value: "prod", wasCreated: false },
        ],
        isRegex: true,
      }),
    );
  });

  it("fillMatchersFromGroup() creates correct matcher object for a list of alerts with uncommon labels", () => {
    const alerts = [
      MockAlert(
        [],
        [
          { name: "instance", value: "1" },
          { name: "banana", value: "ignore" },
        ],
        "active",
      ),
      MockAlert([], [{ name: "instance", value: "2" }], "suppressed"),
      MockAlert([], [{ name: "instance", value: "3" }], "active"),
    ];
    const group = MockAlertGroup(
      [{ name: "alertname", value: "FakeAlert" }],
      alerts,
      [],
      [
        {
          name: "job",
          value: "mock",
        },
      ],
      {},
    );
    group.allLabels.active = {
      alertname: ["FakeAlert"],
      job: ["mock"],
      instance: ["dev1", "prod1", "prod2"],
      cluster: ["dev", "prod"],
    };

    store.data.fillMatchersFromGroup(
      group,
      ["job"],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] }),
      [group.alerts[0], group.alerts[2]],
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(2);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [
          { label: "1", value: "1", wasCreated: false },
          { label: "3", value: "3", wasCreated: false },
        ],
        isRegex: true,
      }),
    );
  });

  it("fillMatchersFromGroup() creates correct matcher object for a list of alerts with no labels", () => {
    const alerts = [
      MockAlert([], [], "active"),
      MockAlert([], [], "suppressed"),
      MockAlert([], [], "active"),
    ];
    const group = MockAlertGroup(
      [{ name: "alertname", value: "FakeAlert" }],
      alerts,
      [],
      [{ name: "job", value: "mock" }],
      {},
    );
    group.allLabels.active = {
      alertname: ["FakeAlert"],
    };

    store.data.fillMatchersFromGroup(
      group,
      ["job"],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] }),
      [group.alerts[0], group.alerts[2]],
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(1);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert", wasCreated: false }],
        isRegex: false,
      }),
    );
  });

  it("fillMatchersFromGroup() creates correct matcher object for a group with only a subset of alerts passed", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(
      group,
      [],
      AlertmanagerClustersToOption({ ha: ["am1", "am2"] }),
      [group.alerts[0]],
    );
    expect(store.data.alertmanagers).toMatchObject([
      { label: "Cluster: ha", value: ["am1", "am2"] },
    ]);
    expect(store.data.matchers).toHaveLength(4);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "job",
        values: [{ label: "mock", value: "mock", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "instance",
        values: [{ label: "prod1", value: "prod1", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "cluster",
        values: [{ label: "prod", value: "prod", wasCreated: false }],
        isRegex: false,
      }),
    );
  });

  it("fillMatchersFromGroup() ignores labels from stripLabels list", () => {
    const group = MockGroup();
    store.data.fillMatchersFromGroup(
      group,
      ["job", "instance", "cluster"],
      [],
      [group.alerts[0]],
    );
    expect(store.data.matchers).toHaveLength(1);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [{ label: "FakeAlert", value: "FakeAlert", wasCreated: false }],
        isRegex: false,
      }),
    );
  });

  it("fillMatchersFromGroup() handles alerts with different label sets", () => {
    const group = MockAlertGroup(
      [{ name: "region", value: "AF" }],
      [
        MockAlert(
          [],
          [
            { name: "alertname", value: "Alert1" },
            { name: "cluster", value: "prod" },
            { name: "foo", value: "bar" },
          ],
          "active",
        ),
        MockAlert(
          [],
          [
            { name: "alertname", value: "Alert2" },
            { name: "cluster", value: "prod2" },
            { name: "foo", value: "prod" },
          ],
          "active",
        ),
        MockAlert(
          [],
          [
            { name: "alertname", value: "Alert3" },
            { name: "instance", value: "dev1" },
          ],
          "active",
        ),
      ],
      [],
      [{ name: "job", value: "mock" }],
      {},
    );
    group.allLabels.active = {
      alertname: ["Alert1", "Alert2", "Alert3"],
      job: ["mock"],
      region: ["AF"],
    };
    store.data.fillMatchersFromGroup(group, [], []);
    expect(store.data.matchers).toHaveLength(3);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "region",
        values: [{ label: "AF", value: "AF", wasCreated: false }],
        isRegex: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "alertname",
        values: [
          { label: "Alert1", value: "Alert1", wasCreated: false },
          { label: "Alert2", value: "Alert2", wasCreated: false },
          { label: "Alert3", value: "Alert3", wasCreated: false },
        ],
        isRegex: true,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "job",
        values: [{ label: "mock", value: "mock", wasCreated: false }],
        isRegex: false,
      }),
    );
  });

  it("fillMatchersFromGroup() resets silenceID if set", () => {
    store.data.setSilenceID("12345");
    const group = MockGroup();
    store.data.fillMatchersFromGroup(group, [], [], [group.alerts[0]]);
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

    expect(store.data.matchers).toHaveLength(4);
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "regex",
        values: [{ label: "equal", value: "equal", wasCreated: true }],
        isRegex: true,
        isEqual: true,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "regex",
        values: [{ label: "notEqual", value: "notEqual", wasCreated: true }],
        isRegex: true,
        isEqual: false,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "notRegex",
        values: [{ label: "equal", value: "equal", wasCreated: true }],
        isRegex: false,
        isEqual: true,
      }),
    );
    expect(store.data.matchers).toContainEqual(
      expect.objectContaining({
        name: "notRegex",
        values: [{ label: "notEqual", value: "notEqual", wasCreated: true }],
        isRegex: false,
        isEqual: false,
      }),
    );

    expect(store.data.startsAt.toISOString()).toBe(
      new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).toISOString(),
    );
    expect(store.data.endsAt.toISOString()).toBe(
      new Date(Date.UTC(2000, 0, 1, 1, 0, 0)).toISOString(),
    );

    expect(store.data.author).toBe("me@example.com");
    expect(store.data.comment).toBe("Mocked Silence");
  });

  const tests = [
    {
      matcher: {
        name: "foo",
        value: "(bar1|bar2|bar3)",
        isRegex: true,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [
          StringToOption("bar1"),
          StringToOption("bar2"),
          StringToOption("bar3"),
        ],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "(bar1|bar2|bar3)",
        isRegex: false,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("(bar1|bar2|bar3)"), wasCreated: true }],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "bar1|bar2|bar3)",
        isRegex: false,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("bar1|bar2|bar3)"), wasCreated: true }],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "(bar1|bar2|bar3",
        isRegex: false,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("(bar1|bar2|bar3"), wasCreated: true }],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "bar1|bar2|bar3",
        isRegex: true,
        isEqual: false,
      },
      result: {
        name: "foo",
        values: [
          StringToOption("bar1"),
          StringToOption("bar2"),
          StringToOption("bar3"),
        ],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "bar1|bar2|bar3",
        isRegex: false,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("bar1|bar2|bar3"), wasCreated: true }],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "(.+|bar2|bar3)",
        isRegex: true,
        isEqual: false,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("(.+|bar2|bar3)"), wasCreated: true }],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "bar1|bar?|bar3)",
        isRegex: true,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("bar1|bar?|bar3)"), wasCreated: true }],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "server(0|1)",
        isRegex: true,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("server(0|1)"), wasCreated: true }],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "10\\.0\\.0\\.1|10\\.0\\.0\\.2",
        isRegex: true,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [StringToOption("10.0.0.1"), StringToOption("10.0.0.2")],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "10\\.0\\.0\\.1|10\\.0\\.0\\.2",
        isRegex: false,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [
          {
            ...StringToOption("10\\.0\\.0\\.1|10\\.0\\.0\\.2"),
            wasCreated: true,
          },
        ],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "(bar\\-1|bar\\-2|1\\.2)",
        isRegex: true,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [
          StringToOption("bar-1"),
          StringToOption("bar-2"),
          StringToOption("1.2"),
        ],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "(bar\\-1|bar\\-2|1\\.2)",
        isRegex: false,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [
          { ...StringToOption("(bar\\-1|bar\\-2|1\\.2)"), wasCreated: true },
        ],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "foo bar|1-2",
        isRegex: true,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [StringToOption("foo bar"), StringToOption("1-2")],
      },
    },
    {
      matcher: {
        name: "foo",
        value: "foo bar|1-2",
        isRegex: false,
        isEqual: true,
      },
      result: {
        name: "foo",
        values: [{ ...StringToOption("foo bar|1-2"), wasCreated: true }],
      },
    },
  ];
  for (const t of tests) {
    it(`fillFormFromSilence() unpacks ${t.matcher.name}=${
      t.matcher.value
    } isRegex=${t.matcher.isRegex} into ${t.result.name}=${JSON.stringify(
      t.result.values.map((v) => v.value),
    )}`, () => {
      const silenceFormStorestore = new SilenceFormStore();
      const alertmanager = MockAlertmanager();
      const silence = MockSilence();
      silence.matchers = [t.matcher];
      silenceFormStorestore.data.fillFormFromSilence(alertmanager, silence);

      expect(silenceFormStorestore.data.matchers).toHaveLength(1);
      expect(silenceFormStorestore.data.matchers).toContainEqual(
        expect.objectContaining({
          name: t.result.name,
          values: t.result.values,
          isRegex: t.matcher.isRegex,
          isEqual: t.matcher.isEqual,
        }),
      );
    });
  }

  it("toAlertmanagerPayload constains id when store.data.silenceID is set", () => {
    store.data.setSilenceID("12345");
    expect(store.data.toAlertmanagerPayload).toMatchObject({
      id: "12345",
    });
  });

  it("toAlertmanagerPayload doesn't contain id when store.data.silenceID is null", () => {
    store.data.setSilenceID(null);
    expect(store.data.toAlertmanagerPayload.id).toBeUndefined();
  });

  it("toAlertmanagerPayload creates payload that matches snapshot", () => {
    const group = MockGroup();
    group.allLabels.active = {
      alertname: ["FakeAlert"],
      job: ["mock"],
      instance: ["dev1", "prod1", "prod2"],
      cluster: ["dev", "prod"],
    };
    store.data.fillMatchersFromGroup(group, [], []);
    // add empty matcher so we test empty string rendering
    store.data.addEmptyMatcher();
    store.data.setStart(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));
    store.data.setEnd(new Date(Date.UTC(2000, 1, 1, 1, 0, 0)));
    store.data.setAuthor("me@example.com");
    store.data.setComment("toAlertmanagerPayload test");
    expect(store.data.toAlertmanagerPayload).toMatchSnapshot();
  });

  it("toAlertmanagerPayload creates payload that matches snapshot with regex values", () => {
    store.data.setMatchers([
      {
        id: "1",
        name: "notEqualRegexAuto",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: false }],
        isEqual: false,
        isRegex: true,
      },
      {
        id: "2",
        name: "equalRegexAuto",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: false }],
        isEqual: true,
        isRegex: true,
      },
      {
        id: "3",
        name: "equalNotRegexAuto",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: false }],
        isEqual: true,
        isRegex: false,
      },
      {
        id: "4",
        name: "notEqualnotRegexAuto",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: false }],
        isEqual: false,
        isRegex: false,
      },
      {
        id: "5",
        name: "notEqualRegexCreated",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: true }],
        isEqual: false,
        isRegex: true,
      },
      {
        id: "6",
        name: "equalRegexCreated",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: true }],
        isEqual: true,
        isRegex: true,
      },
      {
        id: "7",
        name: "equalNotRegexCreated",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: true }],
        isEqual: true,
        isRegex: false,
      },
      {
        id: "8",
        name: "notEqualnotRegexAuto",
        values: [{ label: "foo", value: "^(.+)$", wasCreated: true }],
        isEqual: false,
        isRegex: false,
      },
      {
        id: "9",
        name: "notEqualRegexCreatedMulti",
        values: [
          { label: "foo", value: "^(.+)$", wasCreated: true },
          { label: "bar", value: "\\", wasCreated: true },
        ],
        isEqual: false,
        isRegex: true,
      },
      {
        id: "10",
        name: "equalRegexCreatedMulti",
        values: [
          { label: "foo", value: "^(.+)$", wasCreated: true },
          { label: "bar", value: "\\", wasCreated: true },
        ],
        isEqual: true,
        isRegex: true,
      },
      {
        id: "11",
        name: "notEqualRegexAuto",
        values: [
          { label: "foo", value: "^(.+)$", wasCreated: false },
          { label: "bar", value: "\\", wasCreated: true },
        ],
        isEqual: false,
        isRegex: true,
      },
      {
        id: "12",
        name: "equalRegexAuto",
        values: [
          { label: "foo", value: "^(.+)$", wasCreated: false },
          { label: "bar", value: "\\", wasCreated: true },
        ],
        isEqual: true,
        isRegex: true,
      },
    ]);
    store.data.setStart(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));
    store.data.setEnd(new Date(Date.UTC(2000, 1, 1, 1, 0, 0)));
    store.data.setAuthor("me@example.com");
    store.data.setComment("toAlertmanagerPayload test");
    expect(store.data.toAlertmanagerPayload).toMatchSnapshot();
  });

  it("dumps to base64 and back", () => {
    store.data.setMatchers([
      MockMatcher("foo", [StringToOption("bar")]),
      MockMatcher("instance", [StringToOption("server0|server1")]),
      MockMatcher("cluster", [StringToOption("prod"), StringToOption("dev")]),
      MockMatcher("job", [StringToOption("abc.+")]),
    ]);
    store.data.setStart(new Date());
    store.data.setEnd(addMinutes(addHours(store.data.startsAt, 7), 45));
    store.data.setComment("base64");
    const b64 = store.data.toBase64;

    store.data.setMatchers([]);
    store.data.setComment("");

    store.data.fromBase64(b64);
    expect(store.data.matchers).toMatchObject([
      {
        isRegex: false,
        name: "foo",
        values: [StringToOption("bar")],
      },
      {
        isRegex: false,
        name: "instance",
        values: [StringToOption("server0|server1")],
      },
      {
        isRegex: false,
        name: "cluster",
        values: [StringToOption("prod"), StringToOption("dev")],
      },
      {
        isRegex: false,
        name: "job",
        values: [StringToOption("abc.+")],
      },
    ]);
    expect(store.data.comment).toBe("base64");
    expect(differenceInMinutes(store.data.endsAt, store.data.startsAt)).toBe(
      7 * 60 + 45,
    );
  });

  it("base64 restore ignores empty matchers", () => {
    store.data.setMatchers([]);
    store.data.setComment("base64");
    const b64 = store.data.toBase64;

    store.data.setMatchers([]);
    store.data.setComment("foo");

    store.data.fromBase64(b64);
    expect(store.data.matchers).toMatchObject([]);
    expect(store.data.comment).toBe("foo");
  });
});

describe("SilenceFormStore.data.isValid", () => {
  it("isValid returns 'false' if alertmanagers list is empty", () => {
    store.data.setMatchers([
      MockMatcher("foo", [{ label: "bar", value: "bar", wasCreated: false }]),
    ]);
    store.data.setAuthor("me@example.com");
    store.data.setComment("fake silence");
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is empty", () => {
    store.data.setAlertmanagers([MockAlertmanagerOption()]);
    store.data.setMatchers([]);
    store.data.setAuthor("me@example.com");
    store.data.setComment("fake silence");
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is pupulated when a matcher without any name", () => {
    store.data.setAlertmanagers([MockAlertmanagerOption()]);
    store.data.setMatchers([
      MockMatcher("", [{ label: "bar", value: "bar", wasCreated: false }]),
    ]);
    store.data.setAuthor("me@example.com");
    store.data.setComment("fake silence");
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is pupulated when a matcher without any value ([])", () => {
    store.data.setAlertmanagers([MockAlertmanagerOption()]);
    store.data.setMatchers([MockMatcher("foo", [])]);
    store.data.setAuthor("me@example.com");
    store.data.setComment("fake silence");
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if matchers list is pupulated when a matcher with empty value ([''])", () => {
    store.data.setAlertmanagers([MockAlertmanagerOption()]);
    store.data.setMatchers([MockMatcher("foo", [])]);
    store.data.setAuthor("me@example.com");
    store.data.setComment("fake silence");
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if author is empty", () => {
    store.data.setAlertmanagers([MockAlertmanagerOption()]);
    store.data.setMatchers([
      MockMatcher("foo", [{ label: "bar", value: "bar", wasCreated: false }]),
    ]);
    store.data.setAuthor("");
    store.data.setComment("fake silence");
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'false' if comment is empty", () => {
    store.data.setAlertmanagers([MockAlertmanagerOption()]);
    store.data.setMatchers([
      MockMatcher("foo", [{ label: "bar", value: "bar", wasCreated: false }]),
    ]);
    store.data.setAuthor("me@example.com");
    store.data.setComment("");
    expect(store.data.isValid).toBe(false);
  });

  it("isValid returns 'true' if all fileds are set", () => {
    store.data.setAlertmanagers([MockAlertmanagerOption()]);
    store.data.setMatchers([
      MockMatcher("foo", [{ label: "bar", value: "bar", wasCreated: false }]),
    ]);
    store.data.setAuthor("me@example.com");
    store.data.setComment("fake silence");
    expect(store.data.isValid).toBe(true);
  });
});

describe("SilenceFormStore.data startsAt & endsAt validation", () => {
  it("toDuration returns correct duration for 5d 0h 1m", () => {
    store.data.setStart(new Date(2000, 1, 1, 0, 0, 0));
    store.data.setEnd(new Date(2000, 1, 6, 0, 1, 15));
    expect(store.data.toDuration).toMatchObject({
      days: 5,
      hours: 0,
      minutes: 1,
    });
  });

  it("toDuration returns correct duration for 2h 15m", () => {
    store.data.setStart(new Date(2000, 1, 1, 0, 0, 0));
    store.data.setEnd(new Date(2000, 1, 1, 2, 15, 0));
    expect(store.data.toDuration).toMatchObject({
      days: 0,
      hours: 2,
      minutes: 15,
    });
  });

  it("toDuration returns correct duration for 59m", () => {
    store.data.setStart(new Date(2000, 1, 1, 0, 10, 0));
    store.data.setEnd(new Date(2000, 1, 1, 1, 9, 0));
    expect(store.data.toDuration).toMatchObject({
      days: 0,
      hours: 0,
      minutes: 59,
    });
  });

  it("verifyStarEnd() doesn't do anything if endsAt if after startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 0);
    const endsAt = new Date(2063, 1, 1, 1, 1, 0);
    store.data.setStart(startsAt);
    store.data.setEnd(endsAt);
    store.data.verifyStarEnd();
    expect(store.data.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(store.data.endsAt.toISOString()).toBe(endsAt.toISOString());
  });

  it("verifyStarEnd() updates startsAt if it's before now()", () => {
    const now = new Date();
    now.setSeconds(0);
    const startsAt = new Date(2000, 1, 1, 0, 0, 1);
    const endsAt = new Date(2063, 1, 1, 0, 0, 0);
    store.data.setStart(startsAt);
    store.data.setEnd(endsAt);
    store.data.verifyStarEnd();
    expect(store.data.startsAt >= now).toBeTruthy();
    expect(store.data.endsAt.toISOString()).toBe(endsAt.toISOString());
  });

  it("verifyStarEnd() updates endsAt if it's before startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 1);
    const endsAt = new Date(2063, 1, 1, 0, 0, 0);
    store.data.setStart(startsAt);
    store.data.setEnd(endsAt);
    store.data.verifyStarEnd();
    expect(store.data.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(store.data.endsAt.toISOString()).toBe(
      new Date(2063, 1, 1, 0, 1, 1).toISOString(),
    );
  });

  it("incStart(7) adds 7 minutes to startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.setStart(startsAt);
    store.data.incStart(7);
    const diffMS = differenceInMilliseconds(store.data.startsAt, startsAt);
    expect(diffMS).toBe(7 * 60 * 1000);
  });

  it("decStart(14) subtracts 14 minutes from startsAt", () => {
    const startsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.setStart(startsAt);
    store.data.decStart(14);
    const diffMS = differenceInMilliseconds(store.data.startsAt, startsAt);
    expect(diffMS).toBe(-14 * 60 * 1000);
  });

  it("incEnd(120) adds 120 minutes to endsAt", () => {
    const endsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.setEnd(endsAt);
    store.data.incEnd(120);
    const diffMS = differenceInMilliseconds(store.data.endsAt, endsAt);
    expect(diffMS).toBe(120 * 60 * 1000);
  });

  it("decEnd(1) subtracts 1 minute from endsAt", () => {
    const endsAt = new Date(2063, 1, 1, 0, 0, 1);
    store.data.setEnd(endsAt);
    store.data.decEnd(1);
    const diffMS = differenceInMilliseconds(store.data.endsAt, endsAt);
    expect(diffMS).toBe(-1 * 60 * 1000);
  });
});

describe("SilenceFormStore.tab", () => {
  it("current tab is Editor by default", () => {
    expect(store.tab.current).toBe("editor");
  });

  it("setTab() sets the current tab", () => {
    expect(store.tab.current).toBe("editor");
    store.tab.setTab("browser");
    expect(store.tab.current).toBe("browser");
  });
});

import { MockAlert, MockAlertGroup } from "__fixtures__/Alerts";
import { alertToJSON, VanillaAlertT } from "./Alert";

describe("alertToJSON", () => {
  it("simple alert", () => {
    const group = MockAlertGroup(
      [{ name: "alertname", value: "foo" }],
      [],
      [
        {
          name: "link",
          value: "url",
          visible: true,
          isAction: false,
          isLink: true,
        },
      ],
      [{ name: "job", value: "mock" }],
      {},
    );
    const alert = MockAlert(
      [
        {
          name: "runbook",
          value: "readme.md",
          visible: false,
          isAction: false,
          isLink: true,
        },
      ],
      [{ name: "instance", value: "server1" }],
      "active",
    );
    const expected: VanillaAlertT = {
      labels: { alertname: "foo", instance: "server1", job: "mock" },
      annotations: { link: "url", runbook: "readme.md" },
      fingerprint: "1234567",
      receivers: ["by-name"],
      startsAt: "2018-08-14T17:36:40.017867056Z",
      generatorURL: "localhost/graph",
      status: {
        inhibitedBy: [],
        silencedBy: [],
        state: "active",
      },
    };
    expect(alertToJSON(group, alert)).toStrictEqual([expected]);
  });

  it("duplicated alert", () => {
    const group = MockAlertGroup([], [], [], [], {});
    const alert = MockAlert([], [], "active");
    alert.alertmanager.push({ ...alert.alertmanager[0] });
    const expected: VanillaAlertT = {
      labels: {},
      annotations: {},
      fingerprint: "1234567",
      receivers: ["by-name"],
      startsAt: "2018-08-14T17:36:40.017867056Z",
      generatorURL: "localhost/graph",
      status: {
        inhibitedBy: [],
        silencedBy: [],
        state: "active",
      },
    };
    expect(alertToJSON(group, alert)).toStrictEqual([expected]);
  });
  it("non-duplicated alert", () => {
    const group = MockAlertGroup([], [], [], [], {});
    const alert = MockAlert([], [], "active");
    alert.alertmanager.push({ ...alert.alertmanager[0] });
    alert.alertmanager[0].state = "active";
    alert.alertmanager[1].state = "suppressed";
    expect(alert.alertmanager).toHaveLength(2);
    expect(alert.alertmanager[0].state).toBe("active");
    expect(alert.alertmanager[1].state).toBe("suppressed");

    const expected1: VanillaAlertT = {
      labels: {},
      annotations: {},
      fingerprint: "1234567",
      receivers: ["by-name"],
      startsAt: "2018-08-14T17:36:40.017867056Z",
      generatorURL: "localhost/graph",
      status: {
        inhibitedBy: [],
        silencedBy: [],
        state: "active",
      },
    };
    const expected2: VanillaAlertT = {
      labels: {},
      annotations: {},
      fingerprint: "1234567",
      receivers: ["by-name"],
      startsAt: "2018-08-14T17:36:40.017867056Z",
      generatorURL: "localhost/graph",
      status: {
        inhibitedBy: [],
        silencedBy: [],
        state: "suppressed",
      },
    };
    expect(alertToJSON(group, alert)).toHaveLength(2);
    expect(alertToJSON(group, alert)).toContainEqual(expected1);
    expect(alertToJSON(group, alert)).toContainEqual(expected2);
  });
});

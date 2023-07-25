import type { AlertStateT, APIAlertT, APIAlertGroupT } from "Models/APITypes";

export interface VanillaAlertT {
  labels: { [key: string]: string };
  annotations: { [key: string]: string };
  fingerprint: string;
  receivers: string[];
  startsAt: string;
  generatorURL: string;
  status: {
    inhibitedBy: string[];
    silencedBy: string[];
    state: AlertStateT;
  };
}

export const alertToJSON = (
  group: APIAlertGroupT,
  alert: APIAlertT,
): VanillaAlertT[] => {
  const alerts: VanillaAlertT[] = [];

  alert.alertmanager
    .map((am) => ({
      labels: Object.fromEntries([
        ...group.labels.map((l) => [l.name, l.value]),
        ...group.shared.labels.map((l) => [l.name, l.value]),
        ...alert.labels.map((l) => [l.name, l.value]),
      ]),
      annotations: Object.fromEntries([
        ...group.shared.annotations.map((l) => [l.name, l.value]),
        ...alert.annotations.map((l) => [l.name, l.value]),
      ]),
      fingerprint: am.fingerprint,
      receivers: [alert.receiver],
      startsAt: am.startsAt,
      generatorURL: am.source,
      status: {
        inhibitedBy: am.inhibitedBy,
        silencedBy: am.silencedBy,
        state: am.state,
      },
    }))
    .forEach((a) => {
      let found = false;
      const js = JSON.stringify(a);
      for (const v of alerts) {
        if (JSON.stringify(v) === js) {
          found = true;
          break;
        }
      }
      if (!found) {
        alerts.push(a);
      }
    });

  return alerts;
};

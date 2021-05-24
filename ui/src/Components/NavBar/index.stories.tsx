import { storiesOf } from "@storybook/react";

import {
  AlertStore,
  NewUnappliedFilter,
  FilterT,
} from "../../Stores/AlertStore";
import { Settings } from "../../Stores/Settings";
import { SilenceFormStore } from "../../Stores/SilenceFormStore";
import { HistoryMenu } from "./FilterInput/History";
import NavBar from ".";

import "Styles/Percy.scss";

const NewFilter = (
  raw: string,
  name: string,
  matcher: string,
  value: string,
  applied: boolean,
  isValid: boolean,
  hits: number
): FilterT => {
  const filter = NewUnappliedFilter(raw);
  filter.name = name;
  filter.matcher = matcher;
  filter.value = value;
  filter.applied = applied;
  filter.isValid = isValid;
  filter.hits = hits;
  return filter;
};

storiesOf("NavBar", module).add("NavBar", () => {
  const alertStore = new AlertStore([]);
  const settingsStore = new Settings(null);
  const silenceFormStore = new SilenceFormStore();

  alertStore.info.setTotalAlerts(197);
  alertStore.data.setColors({
    cluster: {
      staging: {
        brightness: 205,
        background: "rgba(246,176,247,255)",
      },
    },
    region: {
      AF: {
        brightness: 111,
        background: "rgba(115,101,152,255)",
      },
    },
  });

  alertStore.filters.setFilterValues([
    NewFilter("cluster=staging", "cluster", "=", "staging", true, true, 15),
    NewFilter("region=AF", "region", "=", "AF", true, true, 180),
    NewFilter("instance!=server1", "instance", "!=", "server1", false, true, 0),
    NewFilter("server!!!=", "", "", "", true, false, 0),
    NewFilter("foo", "", "", "", true, true, 2),
    NewFilter(
      "@state=unprocessed",
      "@state",
      "=",
      "unprocessed",
      true,
      true,
      1
    ),
    NewFilter("@state=active", "@state", "=", "active", true, true, 0),
    NewFilter(
      "@state=suppressed",
      "@state",
      "=",
      "suppressed",
      true,
      true,
      101
    ),
  ]);

  settingsStore.filterBarConfig.setAutohide(false);

  const history = [
    [NewFilter("alertname=Foo", "alertname", "=", "foo", true, true, 15)],
    [
      NewFilter("cluster=staging", "cluster", "=", "staging", true, true, 15),
      NewFilter("region=AF", "region", "=", "AF", true, true, 180),
    ],
    [
      NewFilter("cluster=staging", "cluster", "=", "staging", true, true, 15),
      NewFilter("region=AF", "region", "=", "AF", true, true, 180),
      NewFilter(
        "instance!=server1",
        "instance",
        "!=",
        "server1",
        false,
        true,
        0
      ),
    ],
    [
      NewFilter(
        "alertname=VeryVeryVeryVeryVeryLoooooooooooooooongAlertnameeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "alertname",
        "=",
        "VeryVeryVeryVeryVeryLoooooooooooooooongAlertnameeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        true,
        true,
        15
      ),
    ],
    [NewFilter("cluster=staging", "cluster", "=", "staging", true, true, 15)],
    [
      NewFilter(
        "alertname=VeryVeryVeryVeryVeryLoooooooooooooooongAlertnameeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "alertname",
        "=",
        "VeryVeryVeryVeryVeryLoooooooooooooooongAlertnameeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        true,
        true,
        15
      ),
      NewFilter(
        "@state=unprocessed",
        "@state",
        "=",
        "unprocessed",
        true,
        true,
        1
      ),
      NewFilter("@state=active", "@state", "=", "active", true, true, 1),
      NewFilter(
        "@state=suppressed",
        "@state",
        "=",
        "suppressed",
        true,
        true,
        1
      ),
    ],
    [NewFilter("cluster=staging", "cluster", "=", "staging", true, true, 15)],
  ];

  return (
    <>
      <NavBar
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
        fixedTop={false}
      />
      <HistoryMenu
        popperPlacement="top"
        popperRef={() => {}}
        popperStyle={{}}
        filters={history}
        onClear={() => {}}
        alertStore={alertStore}
        settingsStore={settingsStore}
        afterClick={() => {}}
      />
    </>
  );
});

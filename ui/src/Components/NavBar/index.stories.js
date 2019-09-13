import React from "react";

import { storiesOf } from "@storybook/react";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { NavBar } from ".";

import "Percy.scss";

const NewFilter = (raw, name, matcher, value, applied, isValid, hits) => {
  const filter = NewUnappliedFilter(raw);
  filter.name = name;
  filter.matcher = matcher;
  filter.value = value;
  filter.applied = applied;
  filter.isValid = isValid;
  filter.hits = hits;
  return filter;
};

storiesOf("NavBar", module)
  .addDecorator(storyFn => (
    <div className="overflow-auto modal d-block" role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("NavBar", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    const silenceFormStore = new SilenceFormStore();

    alertStore.info.totalAlerts = 197;
    alertStore.data.colors = {
      cluster: {
        staging: {
          brightness: 205,
          background: { red: 246, green: 176, blue: 247, alpha: 255 }
        }
      },
      region: {
        AF: {
          brightness: 111,
          background: { red: 115, green: 101, blue: 152, alpha: 255 }
        }
      }
    };

    alertStore.filters.values = [
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
      NewFilter("server!!!=", "", "", "", true, false, 0),
      NewFilter("foo", "", "", "", true, true, 2)
    ];

    return (
      <NavBar
        alertStore={alertStore}
        settingsStore={settingsStore}
        silenceFormStore={silenceFormStore}
      />
    );
  });

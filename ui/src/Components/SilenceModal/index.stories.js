import React from "react";

import { storiesOf } from "@storybook/react";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherValueToObject
} from "Stores/SilenceFormStore";
import { SilenceModalContent } from "./SilenceModalContent";

import "App.scss";

const MockMatcher = (name, values, isRegex) => {
  const matcher = NewEmptyMatcher();
  matcher.name = name;
  matcher.values = values.map(v => MatcherValueToObject(v));
  matcher.isRegex = isRegex;
  return matcher;
};

storiesOf("SilenceModalContent", module)
  .addDecorator(storyFn => (
    <div className="modal d-block overflow-auto" role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("SilenceModalContent", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    const silenceFormStore = new SilenceFormStore();

    silenceFormStore.toggle.visible = true;
    silenceFormStore.data.matchers = [
      MockMatcher("cluster", ["prod"], false),
      MockMatcher("instance", ["server1", "server3"], true),
      MockMatcher(
        "tooLong",
        [
          "12345",
          "Some Alerts With A Ridiculously Long Name To Test Label Truncation In All The Places We Render Those Alerts"
        ],
        true
      )
    ];
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.author = "me@example.com";
    silenceFormStore.data.comment = "fake silence";
    silenceFormStore.data.resetStartEnd();

    return (
      <SilenceModalContent
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        previewOpen={true}
      />
    );
  });

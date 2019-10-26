import React from "react";

import fetchMock from "fetch-mock";

import { storiesOf } from "@storybook/react";

import { MockSilence } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherValueToObject,
  SilenceTabNames
} from "Stores/SilenceFormStore";
import { SilenceModalContent } from "./SilenceModalContent";

import "Percy.scss";

const MockMatcher = (name, values, isRegex) => {
  const matcher = NewEmptyMatcher();
  matcher.name = name;
  matcher.values = values.map(v => MatcherValueToObject(v));
  matcher.isRegex = isRegex;
  return matcher;
};

storiesOf("SilenceModal", module)
  .addDecorator(storyFn => (
    <div>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("Silence Form", () => {
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

    silenceFormStore.tab.current = SilenceTabNames.Editor;

    return (
      <SilenceModalContent
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        previewOpen={true}
        onDeleteModalClose={() => {}}
      />
    );
  })
  .add("Browser", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    const silenceFormStore = new SilenceFormStore();

    silenceFormStore.tab.current = SilenceTabNames.Browser;

    alertStore.data.upstreams = {
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1"],
          uri: "http://localhost:9093",
          publicURI: "http://example.com",
          error: "",
          version: "0.15.3",
          headers: {}
        }
      ],
      clusters: { am: ["am1"] }
    };

    let silences = [];
    for (var index = 1; index <= 18; index++) {
      const silence = MockSilence();
      silence.startsAt = "2018-08-14T16:00:00Z";
      silence.endsAt = `2018-08-14T18:${index < 10 ? "0" + index : index}:00Z`;
      silence.id = `silence${index}`;
      silences.push({
        cluster: "am",
        silence: silence
      });
    }

    fetchMock.restore().mock("*", silences);

    return (
      <SilenceModalContent
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        onDeleteModalClose={() => {}}
      />
    );
  });

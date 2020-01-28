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
import { DateTimeSelect, TabNames } from "./DateTimeSelect";
import { SilenceModalContent } from "./SilenceModalContent";

import "Styles/Percy.scss";

const MockMatcher = (name, values, isRegex) => {
  const matcher = NewEmptyMatcher();
  matcher.name = name;
  matcher.values = values.map(v => MatcherValueToObject(v));
  matcher.isRegex = isRegex;
  return matcher;
};

const Modal = ({ children }) => (
  <div>
    <div className="modal-dialog modal-lg" role="document">
      <div className="modal-content">{children}</div>
    </div>
  </div>
);

storiesOf("SilenceModal", module)
  .add("Editor", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings();
    const silenceFormStore = new SilenceFormStore();

    alertStore.data.upstreams = {
      clusters: { default: ["default"] },
      instances: [
        {
          name: "default",
          uri: "http://localhost:8080",
          publicURI: "http://example.com",
          readonly: false,
          headers: {},
          error: "",
          version: "0.15.0",
          cluster: "default",
          clusterMembers: ["default"]
        }
      ]
    };

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

    fetchMock.mock(
      "begin:/alerts.json?q=cluster",
      { totalAlerts: 0 },
      {
        overwriteRoutes: true
      }
    );
    fetchMock.mock(
      "begin:/alerts.json?q=instance",
      { totalAlerts: 23 },
      {
        overwriteRoutes: true
      }
    );
    fetchMock.mock(
      "begin:/alerts.json?q=tooLong",
      {
        body: "error",
        status: 503
      },
      {
        overwriteRoutes: true
      }
    );
    fetchMock.mock(
      "begin:/label",
      {
        status: 200,
        body: JSON.stringify([]),
        headers: { "Content-Type": "application/json" }
      },
      {
        overwriteRoutes: true
      }
    );

    const alertStoreReadOnly = new AlertStore([]);
    alertStoreReadOnly.data.upstreams = {
      clusters: { default: ["readonly"] },
      instances: [
        {
          name: "readonly",
          uri: "http://localhost:8080",
          publicURI: "http://example.com",
          readonly: true,
          headers: {},
          error: "",
          version: "0.15.0",
          cluster: "default",
          clusterMembers: ["readonly"]
        }
      ]
    };

    return (
      <React.Fragment>
        <Modal>
          <SilenceModalContent
            alertStore={alertStoreReadOnly}
            silenceFormStore={silenceFormStore}
            settingsStore={settingsStore}
            onHide={() => {}}
            previewOpen={true}
            onDeleteModalClose={() => {}}
          />
        </Modal>
        <Modal>
          <SilenceModalContent
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
            settingsStore={settingsStore}
            onHide={() => {}}
            previewOpen={true}
            onDeleteModalClose={() => {}}
          />
        </Modal>
        <Modal>
          <div className="pt-2">
            <DateTimeSelect
              silenceFormStore={silenceFormStore}
              openTab={TabNames.Start}
            />
          </div>
        </Modal>
        <Modal>
          <div className="pt-2">
            <DateTimeSelect
              silenceFormStore={silenceFormStore}
              openTab={TabNames.End}
            />
          </div>
        </Modal>
      </React.Fragment>
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
          readonly: false,
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
      silence.matchers.push({
        name: "thisIsAveryLongNameToTestMatcherWrapping",
        value: "valueIsAlsoAbitLong",
        isRegex: false
      });
      silence.matchers.push({
        name: "alertname",
        value: "(foo1|foo2|foo3|foo4)",
        isRegex: true
      });
      silence.id = `silence${index}`;
      silences.push({
        cluster: "am",
        alertCount: (index - 1) * 9,
        silence: silence
      });
    }

    fetchMock.mock("begin:/silences.json?", silences, {
      overwriteRoutes: true
    });

    return (
      <Modal>
        <SilenceModalContent
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          onHide={() => {}}
          onDeleteModalClose={() => {}}
        />
      </Modal>
    );
  })
  .add("Empty Browser", () => {
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
          readonly: false,
          error: "",
          version: "0.15.3",
          headers: {}
        }
      ],
      clusters: { am: ["am1"] }
    };

    fetchMock.mock("begin:/silences.json?", [], {
      overwriteRoutes: true
    });

    return (
      <Modal>
        <SilenceModalContent
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          onHide={() => {}}
          onDeleteModalClose={() => {}}
        />
      </Modal>
    );
  });

import { FC } from "react";

import fetchMock from "fetch-mock";

import { storiesOf } from "@storybook/react";

import addHours from "date-fns/addHours";
import addDays from "date-fns/addDays";

import { MockSilence } from "../../__fixtures__/Alerts";
import { AlertStore } from "../../Stores/AlertStore";
import { Settings } from "../../Stores/Settings";
import {
  SilenceFormStore,
  NewEmptyMatcher,
  MatcherWithIDT,
} from "../../Stores/SilenceFormStore";
import { StringToOption } from "../../Common/Select";
import { DateTimeSelect } from "./DateTimeSelect";
import { SilenceModalContent } from "./SilenceModalContent";

import "Styles/Percy.scss";

const MockMatcher = (
  name: string,
  values: string[],
  isRegex: boolean,
  isEqual: boolean
): MatcherWithIDT => {
  const matcher = NewEmptyMatcher();
  matcher.name = name;
  matcher.values = values.map((v) => StringToOption(v));
  matcher.isRegex = isRegex;
  matcher.isEqual = isEqual;
  return matcher;
};

const Modal: FC = ({ children }) => (
  <div>
    <div className="modal-dialog modal-lg" role="document">
      <div className="modal-content">{children}</div>
    </div>
  </div>
);

storiesOf("SilenceModal", module)
  .add("Editor", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings(null);
    const silenceFormStore = new SilenceFormStore();

    alertStore.info.setAuthentication(true, "me@example.com");

    alertStore.data.setUpstreams({
      counters: { healthy: 3, failed: 0, total: 3 },
      clusters: { default: ["default"], HA: ["ha1", "ha2"] },
      instances: [
        {
          name: "default",
          uri: "http://localhost:8080",
          publicURI: "http://example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "default",
          clusterMembers: ["default"],
        },
        {
          name: "ha1",
          uri: "http://localhost:8081",
          publicURI: "http://ha1.example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.20.0",
          cluster: "HA",
          clusterMembers: ["ha1", "ha2"],
        },
        {
          name: "ha2",
          uri: "http://localhost:8082",
          publicURI: "http://ha2.example.com",
          readonly: false,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.20.0",
          cluster: "HA",
          clusterMembers: ["ha1", "ha2"],
        },
      ],
    });

    silenceFormStore.toggle.visible = true;
    silenceFormStore.data.setAutofillMatchers(false);
    silenceFormStore.data.setMatchers([
      MockMatcher("cluster", ["prod"], false, true),
      MockMatcher("instance", ["server1", "server3"], true, false),
      MockMatcher(
        "tooLong",
        [
          "12345",
          "Some Alerts With A Ridiculously Long Name To Test Label Truncation In All The Places We Render Those Alerts",
        ],
        true,
        true
      ),
    ]);
    silenceFormStore.data.addEmptyMatcher();
    silenceFormStore.data.setAuthor("john@example.com");
    silenceFormStore.data.setComment("fake silence");

    silenceFormStore.data.setSilenceID("1234567890");
    silenceFormStore.data.setStart(new Date());
    silenceFormStore.data.setEnd(addDays(addHours(new Date(), 2), 10));

    silenceFormStore.tab.current = "editor";

    fetchMock.mock(
      "begin:/alerts.json?q=cluster",
      { totalAlerts: 0 },
      {
        overwriteRoutes: true,
      }
    );
    fetchMock.mock(
      "begin:/alerts.json?q=instance",
      { totalAlerts: 23 },
      {
        overwriteRoutes: true,
      }
    );
    fetchMock.mock(
      "begin:/alerts.json?q=tooLong",
      {
        body: "error",
        status: 503,
      },
      {
        overwriteRoutes: true,
      }
    );
    fetchMock.mock(
      "begin:/label",
      {
        status: 200,
        body: JSON.stringify([]),
        headers: { "Content-Type": "application/json" },
      },
      {
        overwriteRoutes: true,
      }
    );

    const alertStoreReadOnly = new AlertStore([]);
    alertStoreReadOnly.data.setUpstreams({
      counters: { healthy: 1, failed: 0, total: 1 },
      clusters: { default: ["readonly"] },
      instances: [
        {
          name: "readonly",
          uri: "http://localhost:8080",
          publicURI: "http://example.com",
          readonly: true,
          headers: {},
          corsCredentials: "include",
          error: "",
          version: "0.17.0",
          cluster: "default",
          clusterMembers: ["readonly"],
        },
      ],
    });

    return (
      <>
        <Modal>
          <SilenceModalContent
            alertStore={alertStoreReadOnly}
            silenceFormStore={silenceFormStore}
            settingsStore={settingsStore}
            onHide={() => {}}
            previewOpen={true}
          />
        </Modal>
        <Modal>
          <SilenceModalContent
            alertStore={alertStore}
            silenceFormStore={silenceFormStore}
            settingsStore={settingsStore}
            onHide={() => {}}
            previewOpen={true}
          />
        </Modal>
        <Modal>
          <div className="pt-2">
            <DateTimeSelect
              silenceFormStore={silenceFormStore}
              openTab={"start"}
            />
          </div>
        </Modal>
        <Modal>
          <div className="pt-2">
            <DateTimeSelect
              silenceFormStore={silenceFormStore}
              openTab={"end"}
            />
          </div>
        </Modal>
      </>
    );
  })
  .add("Browser", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings(null);
    const silenceFormStore = new SilenceFormStore();

    silenceFormStore.tab.current = "browser";

    alertStore.data.setUpstreams({
      counters: { healthy: 1, failed: 0, total: 1 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1"],
          uri: "http://localhost:9093",
          publicURI: "http://example.com",
          readonly: false,
          error: "",
          version: "0.17.0",
          headers: {},
          corsCredentials: "include",
        },
      ],
      clusters: { am: ["am1"] },
    });

    const silences = [];
    for (let index = 1; index <= 18; index++) {
      const silence = MockSilence();
      silence.startsAt = "2018-08-14T16:00:00Z";
      silence.endsAt = `2018-08-14T18:${index < 10 ? "0" + index : index}:00Z`;
      silence.matchers.push({
        name: "thisIsAveryLongNameToTestMatcherWrapping",
        value: "valueIsAlsoAbitLong",
        isRegex: false,
        isEqual: true,
      });
      silence.matchers.push({
        name: "alertname",
        value: "(foo1|foo2|foo3|foo4)",
        isRegex: true,
        isEqual: true,
      });
      silence.id = `silence${index}`;
      silences.push({
        cluster: "am",
        alertCount: (index - 1) * 9,
        silence: silence,
      });
    }

    fetchMock.mock("begin:/silences.json?", silences, {
      overwriteRoutes: true,
    });

    return (
      <Modal>
        <SilenceModalContent
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          onHide={() => {}}
        />
      </Modal>
    );
  })
  .add("Empty Browser", () => {
    const alertStore = new AlertStore([]);
    const settingsStore = new Settings(null);
    const silenceFormStore = new SilenceFormStore();

    silenceFormStore.tab.current = "browser";

    alertStore.data.setUpstreams({
      counters: { healthy: 1, failed: 0, total: 1 },
      instances: [
        {
          name: "am1",
          cluster: "am",
          clusterMembers: ["am1"],
          uri: "http://localhost:9093",
          publicURI: "http://example.com",
          readonly: false,
          error: "",
          version: "0.17.0",
          headers: {},
          corsCredentials: "include",
        },
      ],
      clusters: { am: ["am1"] },
    });

    fetchMock.mock(
      "begin:/silences.json?",
      {
        status: 200,
        body: JSON.stringify([]),
        headers: { "Content-Type": "application/json" },
      },
      {
        overwriteRoutes: true,
      }
    );

    return (
      <Modal>
        <SilenceModalContent
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          settingsStore={settingsStore}
          onHide={() => {}}
        />
      </Modal>
    );
  });

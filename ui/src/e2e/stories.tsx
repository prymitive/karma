import React from "react";
import { createRoot } from "react-dom/client";

import { addHours } from "date-fns/addHours";
import { addDays } from "date-fns/addDays";

import { faArrowUp } from "@fortawesome/free-solid-svg-icons/faArrowUp";
import { faExclamation } from "@fortawesome/free-solid-svg-icons/faExclamation";

import { ThemeContext } from "Components/Theme";
import type { ThemeCtx } from "Components/Theme";
import {
  ReactSelectColors,
  ReactSelectStyles,
} from "Components/Theme/ReactSelect";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";

import { MockGrid } from "__fixtures__/Stories";
import { MockSilence } from "__fixtures__/Alerts";

import { FatalError } from "Components/Grid/FatalError";
import { UpgradeNeeded } from "Components/Grid/UpgradeNeeded";
import { ReloadNeeded } from "Components/Grid/ReloadNeeded";
import { EmptyGrid } from "Components/Grid/EmptyGrid";
import { NoUpstream } from "Components/Grid/NoUpstream";
import Grid from "Components/Grid";
import NavBar from "Components/NavBar";
import { InternalError } from "ErrorBoundary";
import { MainModalContent } from "Components/MainModal/MainModalContent";
import { OverviewModalContent } from "Components/OverviewModal/OverviewModalContent";
import { ManagedSilence } from "Components/ManagedSilence";
import { SilenceModalContent } from "Components/SilenceModal/SilenceModalContent";
import { Toast } from "Components/Toast";
import {
  ToastMessage,
  UpgradeToastMessage,
} from "Components/Toast/ToastMessages";

import "Styles/Percy.scss";

const jsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const mockSilenceEntry = (index: number) => {
  const s = MockSilence();
  s.startsAt = "2018-08-14T16:00:00Z";
  s.endsAt = `2018-08-14T18:${index < 10 ? "0" + index : index}:00Z`;
  s.matchers.push({
    name: "thisIsAveryLongNameToTestMatcherWrapping",
    value: "valueIsAlsoAbitLong",
    isRegex: false,
    isEqual: true,
  });
  s.matchers.push({
    name: "alertname",
    value: "(foo1|foo2|foo3|foo4)",
    isRegex: true,
    isEqual: true,
  });
  s.id = `silence${index}`;
  return { cluster: "am", alertCount: (index - 1) * 9, silence: s };
};

const countersData = {
  total: 90,
  counters: [
    {
      name: "@receiver",
      hits: 2,
      values: [
        {
          value: "by-cluster-service",
          raw: "@receiver=by-cluster-service",
          hits: 2,
          percent: 100,
          offset: 0,
        },
      ],
    },
    {
      name: "alertname",
      hits: 90,
      values: [
        {
          value: "Fake Alert",
          raw: "alertname=Fake Alert",
          hits: 45,
          percent: 50,
          offset: 0,
        },
        {
          value: "Second Fake Alert",
          raw: "alertname=Second Fake Alert",
          hits: 45,
          percent: 50,
          offset: 50,
        },
      ],
    },
    {
      name: "group",
      hits: 100,
      values: [
        {
          value: "group1",
          raw: "group=group1",
          hits: 25,
          percent: 25,
          offset: 0,
        },
        {
          value: "group2",
          raw: "group=group2",
          hits: 70,
          percent: 70,
          offset: 25,
        },
        {
          value: "group3",
          raw: "group=group3",
          hits: 4,
          percent: 4,
          offset: 95,
        },
        {
          value: "group4",
          raw: "group=group4",
          hits: 1,
          percent: 1,
          offset: 99,
        },
      ],
    },
  ],
};

const originalFetch = window.fetch;
window.fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const story = window.location.hash.replace("#", "").split("?")[0];

  if (url.includes("labelNames.json"))
    return jsonResponse(["cluster", "job", "instance"]);
  if (url.includes("labelValues.json"))
    return jsonResponse(["dev", "staging", "prod"]);
  if (url.includes("alertList.json")) return jsonResponse({ alerts: [] });
  if (url.includes("autocomplete.json")) return jsonResponse([]);
  if (url.includes("alerts.json"))
    return jsonResponse({ alerts: [], totalAlerts: 0 });

  if (url.includes("counters.json")) {
    if (story === "OverviewModal") return jsonResponse(countersData);
    return jsonResponse({ total: 0, counters: [] });
  }

  if (url.includes("silences.json")) {
    if (story === "SilenceModalBrowser") {
      const silences = Array.from({ length: 18 }, (_, i) =>
        mockSilenceEntry(i + 1),
      );
      return jsonResponse(silences);
    }
    return jsonResponse([]);
  }

  return originalFetch(input, init);
};

type StoryMap = Record<string, () => React.ReactNode>;

const Modal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="modal d-block" style={{ position: "relative" }}>
    <div className="modal-dialog modal-lg" role="document">
      <div className="modal-content">{children}</div>
    </div>
  </div>
);

const makeAlertStore = (): AlertStore => {
  const alertStore = new AlertStore([]);
  alertStore.data.setUpstreams({
    counters: { total: 1, healthy: 1, failed: 0 },
    instances: [
      {
        name: "am1",
        cluster: "am",
        clusterMembers: ["am1"],
        uri: "http://localhost:9093",
        publicURI: "http://example.com",
        readonly: false,
        error: "",
        version: "0.24.0",
        headers: {},
        corsCredentials: "include",
      },
    ],
    clusters: { am: ["am1"] },
  });
  return alertStore;
};

const makeReadOnlyAlertStore = (): AlertStore => {
  const alertStore = new AlertStore([]);
  alertStore.data.setUpstreams({
    counters: { healthy: 1, failed: 0, total: 1 },
    clusters: { ro: ["readonly"] },
    instances: [
      {
        name: "readonly",
        uri: "http://localhost:8080",
        publicURI: "http://example.com",
        readonly: true,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.24.0",
        cluster: "ro",
        clusterMembers: ["readonly"],
      },
    ],
  });
  return alertStore;
};

const gridStory = (): React.ReactNode => {
  const alertStore = new AlertStore([]);
  const settingsStore = new Settings(null);
  const silenceFormStore = new SilenceFormStore();
  MockGrid(alertStore);
  return (
    <Grid
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
    />
  );
};

const navBarStory = (): React.ReactNode => {
  const alertStore = new AlertStore([]);
  const settingsStore = new Settings(null);
  const silenceFormStore = new SilenceFormStore();
  alertStore.data.setUpstreams({
    counters: { total: 1, healthy: 1, failed: 0 },
    instances: [
      {
        name: "dev",
        cluster: "dev",
        clusterMembers: ["dev"],
        uri: "https://am.example.com",
        publicURI: "https://am.example.com",
        error: "",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        version: "",
      },
    ],
    clusters: { dev: ["dev"] },
  });
  alertStore.info.setTotalAlerts(197);
  settingsStore.filterBarConfig.setAutohide(false);
  return (
    <NavBar
      alertStore={alertStore}
      settingsStore={settingsStore}
      silenceFormStore={silenceFormStore}
      fixedTop={false}
    />
  );
};

const fatalErrorStory = (): React.ReactNode => (
  <FatalError message="Something failed with a veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping" />
);

const upgradeNeededStory = (): React.ReactNode => (
  <UpgradeNeeded newVersion="1.2.3" reloadAfter={100000000} />
);

const reloadNeededStory = (): React.ReactNode => (
  <ReloadNeeded reloadAfter={100000000} />
);

const emptyGridStory = (): React.ReactNode => (
  <div className="text-center">
    <EmptyGrid />
  </div>
);

const noUpstreamStory = (): React.ReactNode => <NoUpstream />;

const internalErrorStory = (): React.ReactNode => (
  <InternalError
    message="React error boundary message with a veryLongStringToTestTextWrappingveryLongStringToTestTextWrappingveryLongStringToTestTextWrapping"
    secondsLeft={45}
    progressLeft={66}
  />
);

const mainModalStory = (): React.ReactNode => {
  const alertStore = makeAlertStore();
  const settingsStore = new Settings(null);
  alertStore.info.setVersion("1.2.3");
  return (
    <Modal>
      <MainModalContent
        alertStore={alertStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        expandAllOptions={true}
      />
    </Modal>
  );
};

const overviewModalStory = (): React.ReactNode => {
  const alertStore = new AlertStore(["full"]);
  MockGrid(alertStore);
  return (
    <Modal>
      <OverviewModalContent alertStore={alertStore} onHide={() => {}} />
    </Modal>
  );
};

const managedSilenceStory = (): React.ReactNode => {
  const alertStore = makeAlertStore();
  const alertStoreReadOnly = makeReadOnlyAlertStore();
  const silenceFormStore = new SilenceFormStore();

  const silence = MockSilence();
  silence.startsAt = "2018-08-14T16:00:00Z";
  silence.endsAt = "2018-08-14T18:00:00Z";

  const expiredSilence = MockSilence();
  expiredSilence.startsAt = "2018-08-14T10:00:00Z";
  expiredSilence.endsAt = "2018-08-14T11:00:00Z";

  return (
    <div className="modal-dialog modal-lg" role="document">
      <div className="modal-content p-2">
        <ManagedSilence
          cluster="am"
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={silence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
        />
        <ManagedSilence
          cluster="am"
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={silence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
        <ManagedSilence
          cluster="ro"
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={silence}
          alertStore={alertStoreReadOnly}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
        <ManagedSilence
          cluster="am"
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={expiredSilence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
        />
        <ManagedSilence
          cluster="am"
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={expiredSilence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
        <ManagedSilence
          cluster="ro"
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={expiredSilence}
          alertStore={alertStoreReadOnly}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
      </div>
    </div>
  );
};

const silenceModalEditorReadOnlyStory = (): React.ReactNode => {
  const alertStore = makeReadOnlyAlertStore();
  const settingsStore = new Settings(null);
  const silenceFormStore = new SilenceFormStore();
  silenceFormStore.tab.setTab("editor");
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
};

const silenceModalEditorStory = (): React.ReactNode => {
  const alertStore = makeAlertStore();
  const settingsStore = new Settings(null);
  const silenceFormStore = new SilenceFormStore();

  silenceFormStore.data.setAuthor("me@example.com");
  silenceFormStore.data.setComment("This is a test silence");
  silenceFormStore.data.setStart(new Date("2018-08-14T17:36:40"));
  silenceFormStore.data.setEnd(
    addDays(addHours(new Date("2018-08-14T17:36:40"), 2), 10),
  );
  silenceFormStore.tab.setTab("editor");

  return (
    <Modal>
      <SilenceModalContent
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        settingsStore={settingsStore}
        onHide={() => {}}
        previewOpen={true}
      />
    </Modal>
  );
};

const silenceModalBrowserStory = (): React.ReactNode => {
  const alertStore = makeAlertStore();
  const settingsStore = new Settings(null);
  const silenceFormStore = new SilenceFormStore();
  silenceFormStore.tab.setTab("browser");
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
};

const silenceModalEmptyBrowserStory = (): React.ReactNode => {
  const alertStore = makeAlertStore();
  const settingsStore = new Settings(null);
  const silenceFormStore = new SilenceFormStore();
  silenceFormStore.tab.setTab("browser");
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
};

const toastStory = (): React.ReactNode => {
  const alertStore = new AlertStore([]);
  alertStore.info.setVersion("999.99.0");
  return (
    <div className="d-flex flex-column">
      <Toast
        icon={faExclamation}
        iconClass="text-danger"
        message={
          <ToastMessage
            title="Alertmanager am1 raised an error"
            message="connection refused"
          />
        }
        hasClose={true}
      />
      <Toast
        icon={faArrowUp}
        iconClass="text-success"
        message={<UpgradeToastMessage alertStore={alertStore} />}
        hasClose={false}
      />
    </div>
  );
};

const stories: StoryMap = {
  Grid: gridStory,
  NavBar: navBarStory,
  FatalError: fatalErrorStory,
  UpgradeNeeded: upgradeNeededStory,
  ReloadNeeded: reloadNeededStory,
  EmptyGrid: emptyGridStory,
  NoUpstream: noUpstreamStory,
  InternalError: internalErrorStory,
  MainModal: mainModalStory,
  OverviewModal: overviewModalStory,
  ManagedSilence: managedSilenceStory,
  SilenceModalEditorReadOnly: silenceModalEditorReadOnlyStory,
  SilenceModalEditor: silenceModalEditorStory,
  SilenceModalBrowser: silenceModalBrowserStory,
  SilenceModalEmptyBrowser: silenceModalEmptyBrowserStory,
  Toast: toastStory,
};

const lightTheme: ThemeCtx = {
  isDark: false,
  reactSelectStyles: ReactSelectStyles(ReactSelectColors.Light),
  animations: { duration: 0 },
};

const darkTheme: ThemeCtx = {
  isDark: true,
  reactSelectStyles: ReactSelectStyles(ReactSelectColors.Dark),
  animations: { duration: 0 },
};

const StoryRenderer = ({ storyFn }: { storyFn: () => React.ReactNode }) => (
  <div>
    <div className="theme-light">
      <ThemeContext.Provider value={lightTheme}>
        {storyFn()}
      </ThemeContext.Provider>
    </div>
    <div
      style={{
        height: "16px",
        width: "100%",
        backgroundColor: "#eee",
        marginTop: "4px",
        marginBottom: "4px",
      }}
    />
    <div className="theme-dark">
      <ThemeContext.Provider value={darkTheme}>
        {storyFn()}
      </ThemeContext.Provider>
    </div>
  </div>
);

const VisualTestApp = () => {
  const storyName = window.location.hash.replace("#", "") || "";
  const storyFn = stories[storyName];

  if (!storyFn) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Visual Regression Test Stories</h1>
        <ul>
          {Object.keys(stories).map((name) => (
            <li key={name}>
              <a href={`#${name}`}>{name}</a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <StoryRenderer storyFn={storyFn} />;
};

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<VisualTestApp />);
}

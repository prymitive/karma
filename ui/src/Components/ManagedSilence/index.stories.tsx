import { storiesOf } from "@storybook/react";

import { MockSilence } from "../../__fixtures__/Alerts";
import { AlertStore } from "../../Stores/AlertStore";
import { SilenceFormStore } from "../../Stores/SilenceFormStore";
import { ManagedSilence } from ".";

import "Styles/Percy.scss";

storiesOf("ManagedSilence", module)
  .addDecorator((storyFn) => (
    <div>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content p-2">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("Silence", () => {
    const alertStore = new AlertStore([]);
    const silenceFormStore = new SilenceFormStore();
    const cluster = "am";

    alertStore.data.setUpstreams({
      counters: { healthy: 1, failed: 0, total: 1 },
      instances: [
        {
          name: "am1",
          cluster: cluster,
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

    const alertStoreReadOnly = new AlertStore([]);
    alertStoreReadOnly.data.setUpstreams({
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
          version: "0.17.0",
          cluster: "ro",
          clusterMembers: ["readonly"],
        },
      ],
    });

    const silence = MockSilence();
    silence.startsAt = "2018-08-14T16:00:00Z";
    silence.endsAt = "2018-08-14T18:00:00Z";

    const expiredSilence = MockSilence();
    expiredSilence.startsAt = "2018-08-14T10:00:00Z";
    expiredSilence.endsAt = "2018-08-14T11:00:00Z";

    return (
      <>
        <ManagedSilence
          cluster={cluster}
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={silence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
        />
        <ManagedSilence
          cluster={cluster}
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={silence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
        <ManagedSilence
          cluster={"ro"}
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={silence}
          alertStore={alertStoreReadOnly}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
        <ManagedSilence
          cluster={cluster}
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={expiredSilence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
        />
        <ManagedSilence
          cluster={cluster}
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={expiredSilence}
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
        <ManagedSilence
          cluster={"ro"}
          alertCount={123}
          alertCountAlwaysVisible={true}
          silence={expiredSilence}
          alertStore={alertStoreReadOnly}
          silenceFormStore={silenceFormStore}
          onDidUpdate={() => {}}
          isOpen={true}
        />
      </>
    );
  });

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockSilence } from "__fixtures__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { RenderSilence } from "./Silences";

describe("<RenderSilence />", () => {
  let alertStore: AlertStore;
  let silenceFormStore: SilenceFormStore;

  beforeEach(() => {
    alertStore = new AlertStore([]);
    silenceFormStore = new SilenceFormStore();
  });

  it("renders fallback text if silence is not present in AlertStore", () => {
    const tree = mount(
      <RenderSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        afterUpdate={jest.fn()}
        cluster="fakeCluster"
        silenceID="1234567890"
      />
    );
    expect(tree.text()).toBe("Silenced by 1234567890");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("renders ManagedSilence if silence is present in AlertStore", () => {
    const silence = MockSilence();

    alertStore.data.setSilences({ fakeCluster: { [silence.id]: silence } });

    const tree = mount(
      <RenderSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        afterUpdate={jest.fn()}
        cluster="fakeCluster"
        silenceID={silence.id}
      />
    );
    expect(tree.find("ManagedSilence")).toHaveLength(1);
    expect(tree.text()).toMatch(/Mocked Silence/);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("re-render when silence was removed AlertStore is a no-op", () => {
    const silence = MockSilence();

    alertStore.data.setSilences({ fakeCluster: { [silence.id]: silence } });

    const tree = mount(
      <RenderSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        afterUpdate={jest.fn()}
        cluster="fakeCluster"
        silenceID={silence.id}
      />
    );
    expect(tree.find("ManagedSilence")).toHaveLength(1);
    const snapshot = toDiffableHtml(tree.html());

    alertStore.data.setSilences({});

    tree.setProps({});
    expect(tree.find("ManagedSilence")).toHaveLength(1);
    expect(toDiffableHtml(tree.html())).toBe(snapshot);
  });

  it("re-render when silence ID was changed updates it", () => {
    const tree = mount(
      <RenderSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        afterUpdate={jest.fn()}
        cluster="fakeCluster"
        silenceID="silence1"
      />
    );
    expect(tree.text()).toBe("Silenced by silence1");

    tree.setProps({ silenceID: "silence2" });
    expect(tree.text()).toBe("Silenced by silence2");
  });

  it("re-render when cluster name was changed updates it", () => {
    const tree = mount(
      <RenderSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        afterUpdate={jest.fn()}
        cluster="cluster1"
        silenceID="1234567890"
      />
    );
    expect(tree.text()).toBe("Silenced by 1234567890");

    tree.setProps({ cluster: "cluster2" });
    expect(tree.text()).toBe("Silenced by 1234567890");
  });
});

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, NewClusterRequest } from "Stores/SilenceFormStore";
import SilenceSubmitController from "./SilenceSubmitController";
import SingleClusterStatus from "./SingleClusterStatus";
import MultiClusterStatus from "./MultiClusterStatus";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  alertStore.data.setUpstreams({
    counters: { total: 3, healthy: 3, failed: 0 },
    clusters: { ha: ["am1", "am2"], single: ["single"] },
    instances: [
      {
        name: "am1",
        uri: "http://am1.example.com",
        publicURI: "http://am1.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "ha",
        clusterMembers: ["am1", "am2"],
      },
      {
        name: "am2",
        uri: "http://am2.example.com",
        publicURI: "http://am2.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "ha",
        clusterMembers: ["am1", "am2"],
      },
      {
        name: "single",
        uri: "http://single.example.com",
        publicURI: "http://single.example.com",
        readonly: false,
        headers: {},
        corsCredentials: "include",
        error: "",
        version: "0.17.0",
        cluster: "ha",
        clusterMembers: ["single"],
      },
    ],
  });
});

describe("<SilenceSubmitController />", () => {
  it("renders MultiClusterStatus when multiple clusters are used", () => {
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
      single: NewClusterRequest("single", ["single"]),
    });

    const tree = shallow(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("MultiClusterStatus")).toHaveLength(1);
    expect(tree.find("SingleClusterStatus")).toHaveLength(0);
  });

  it("renders SingleClusterStatus when multiple clusters are used", () => {
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    const tree = shallow(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("MultiClusterStatus")).toHaveLength(0);
    expect(tree.find("SingleClusterStatus")).toHaveLength(1);
  });

  it("resets the form on 'Back' button click", () => {
    silenceFormStore.data.setStage("submit");
    const tree = shallow(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    const button = tree.find("button");
    button.simulate("click");
    expect(silenceFormStore.data.currentStage).toBe("form");
  });
});

describe("<MultiClusterStatus />", () => {
  it("renders all passed SilenceSubmitProgress", () => {
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
      single: NewClusterRequest("single", ["single"]),
    });
    const tree = shallow(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("tr")).toHaveLength(2);
  });

  it("renders spinner for pending requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const tree = shallow(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("tr")).toHaveLength(1);
    expect(tree.find("td").at(0).html()).toMatch(/fa-circle-notch/);
    expect(tree.find("td").at(1).text()).toBe("single");
    expect(tree.find("td").at(2).text()).toBe("");
  });

  it("renders error for failed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.error = "fake error";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const tree = shallow(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("tr")).toHaveLength(1);
    expect(tree.find("td").at(0).html()).toMatch(/fa-exclamation-circle/);
    expect(tree.find("td").at(1).text()).toBe("single");
    expect(tree.find("td").at(2).text()).toBe("fake error");
  });

  it("renders silence link for completed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.silenceID = "123456789";
    single.silenceLink = "http://localhost";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const tree = shallow(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("tr")).toHaveLength(1);
    expect(tree.find("td").at(0).html()).toMatch(/fa-check-circle/);
    expect(tree.find("td").at(1).text()).toBe("single");
    expect(tree.find("td").at(2).text()).toBe("123456789");
    expect(
      tree.find("td").at(2).find('a[href="http://localhost"]')
    ).toHaveLength(1);
  });
});

describe("<SingleClusterStatus />", () => {
  it("renders spinner for pending requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const tree = shallow(
      <SingleClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("div.display-1").at(0).html()).toMatch(/fa-circle-notch/);
    expect(tree.find("div.badge.bg-primary").text()).toBe("single");
    expect(tree.find("p")).toHaveLength(0);
  });

  it("renders error for failed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.error = "fake error";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const tree = shallow(
      <SingleClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("div.display-1").at(0).html()).toMatch(
      /fa-exclamation-circle/
    );
    expect(tree.find("div.badge.bg-primary").text()).toBe("single");
    expect(tree.find("p").text()).toBe("fake error");
  });

  it("renders silence link for completed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.silenceID = "123456789";
    single.silenceLink = "http://localhost";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const tree = shallow(
      <SingleClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );

    expect(tree.find("div.display-1").at(0).html()).toMatch(/fa-check-circle/);
    expect(tree.find("div.badge.bg-primary").text()).toBe("single");
    expect(tree.find("p").text()).toBe("123456789");
    expect(tree.find("p").find('a[href="http://localhost"]')).toHaveLength(1);
  });
});

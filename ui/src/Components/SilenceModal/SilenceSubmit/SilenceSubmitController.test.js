import React from "react";

import { shallow } from "enzyme";

import { AlertStore } from "Stores/AlertStore";
import {
  SilenceFormStore,
  SilenceFormStage,
  NewClusterRequest,
} from "Stores/SilenceFormStore";
import { SilenceSubmitController } from "./SilenceSubmitController";

let alertStore;
let silenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  alertStore.data.upstreams = {
    clusters: { ha: ["am1", "am2"], single: "single" },
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
  };
});

describe("<SilenceSubmitController />", () => {
  it("renders all passed SilenceSubmitProgress", () => {
    silenceFormStore.data.requestsByCluster = {
      ha: NewClusterRequest("ha", ["am1", "am2"]),
      single: NewClusterRequest("single", ["single"]),
    };
    const tree = shallow(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    expect(tree.find("tr")).toHaveLength(2);
  });

  it("renders spinner for pending requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    silenceFormStore.data.requestsByCluster = { single: single };
    const tree = shallow(
      <SilenceSubmitController
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
    silenceFormStore.data.requestsByCluster = { single: single };
    const tree = shallow(
      <SilenceSubmitController
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
    silenceFormStore.data.requestsByCluster = { single: single };
    const tree = shallow(
      <SilenceSubmitController
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

  it("resets the form on 'Back' button click", () => {
    silenceFormStore.data.currentStage = SilenceFormStage.Submit;
    const tree = shallow(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />
    );
    const button = tree.find("button");
    button.simulate("click");
    expect(silenceFormStore.data.currentStage).toBe(SilenceFormStage.UserInput);
  });
});

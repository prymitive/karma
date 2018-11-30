import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { AlertStore } from "Stores/AlertStore";
import { SilenceSubmitProgress } from "./SilenceSubmitProgress";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  alertStore.data.upstreams = {
    instances: [
      {
        name: "mockAlertmanager",
        uri: "file:///mock",
        publicURI: "http://example.com",
        error: "",
        version: "0.15.0",
        clusterMembers: ["mockAlertmanager"]
      }
    ]
  };
});

const MountedSilenceSubmitProgress = () => {
  return mount(
    <SilenceSubmitProgress
      name="mockAlertmanager"
      uri="http://localhost/mock"
      payload={{
        matchers: [],
        startsAt: "now",
        endsAt: "later",
        createdBy: "me@example.com",
        comment: "fake payload"
      }}
      alertStore={alertStore}
    />
  );
};

describe("<SilenceSubmitProgress />", () => {
  it("sends a request on mount", () => {
    MountedSilenceSubmitProgress();
    expect(fetch.mock.calls).toHaveLength(1);
  });

  it("appends /api/v1/silences to the passed URI", () => {
    MountedSilenceSubmitProgress();
    const uri = fetch.mock.calls[0][0];
    expect(uri).toBe("http://localhost/mock/api/v1/silences");
  });

  it("sends correct JSON payload", () => {
    MountedSilenceSubmitProgress();
    const payload = fetch.mock.calls[0][1];
    expect(payload).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchers: [],
        startsAt: "now",
        endsAt: "later",
        createdBy: "me@example.com",
        comment: "fake payload"
      })
    });
  });

  it("renders returned silence ID on successful fetch", async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ status: "success", data: { silenceId: "123456789" } })
    );
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("success");
    // force re-render
    tree.update();
    const silenceLink = tree.find("a");
    expect(silenceLink).toHaveLength(1);
    expect(silenceLink.text()).toBe("123456789");
  });

  it("renders returned silence ID as text if alertmanager is not found in AlertStore", async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ status: "success", data: { silenceId: "123456789" } })
    );
    alertStore.data.upstreams.instances = [];
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("success");
    // force re-render
    tree.update();
    const silenceLink = tree.find("a");
    expect(silenceLink).toHaveLength(0);
    const idDiv = tree.find("div.flex-fill").at(2);
    expect(toDiffableHtml(idDiv.html())).toMatchSnapshot();
  });

  it("renders returned error message on failed fetch", async () => {
    fetch.mockRejectOnce(new Error("mock error message"));
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBeUndefined();
    expect(tree.text()).toBe("mockAlertmanagermock error message");
  });

  it("renders success icon on successful fetch", async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ status: "success", data: { silenceId: "123" } })
    );
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("success");
    tree.update();
    expect(tree.find("FontAwesomeIcon.text-success")).toHaveLength(1);
    expect(tree.find("FontAwesomeIcon.text-danger")).toHaveLength(0);
  });

  it("renders error icon on failed fetch", async () => {
    fetch.mockResponseOnce(JSON.stringify({ status: "error" }));
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("error");
    tree.update();
    expect(tree.find("FontAwesomeIcon.text-success")).toHaveLength(0);
    expect(tree.find("FontAwesomeIcon.text-danger")).toHaveLength(1);
  });

  it("renders unhandled 'status' values in the response as error", async () => {
    fetch.mockResponseOnce(JSON.stringify({ status: "unhandled" }));
    const tree = MountedSilenceSubmitProgress();
    await expect(tree.instance().submitState.fetch).resolves.toBe("unhandled");
    tree.update();
    expect(tree.find("FontAwesomeIcon.text-success")).toHaveLength(0);
    expect(tree.find("FontAwesomeIcon.text-danger")).toHaveLength(1);
    expect(tree.text()).toBe('mockAlertmanager{"status":"unhandled"}');
  });
});

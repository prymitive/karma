import React from "react";

import { mount } from "enzyme";

import { EmptyAPIResponse } from "__mocks__/Fetch";
import { MockAlertGroup, MockAlert, MockSilence } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { DeleteSilence, DeleteSilenceModalContent } from "./DeleteSilence";

let alertStore;
let silenceFormStore;
let cluster;
let silence;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();
  fetch.mockResponse(JSON.stringify(MockAPIResponse()));

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        uri: "http://localhost:9093",
        readonly: false,
        error: "",
        version: "0.15.3",
        headers: {}
      }
    ],
    clusters: { am: ["am1"] }
  };

  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  fetch.resetMocks();
});

const MockOnHide = jest.fn();

const MockAPIResponse = () => {
  const response = EmptyAPIResponse();
  response.groups = {
    "1": MockAlertGroup(
      { alertname: "foo" },
      [MockAlert([], { instance: "foo" }, "suppressed")],
      [],
      { job: "foo" },
      {}
    )
  };
  return response;
};

const MountedDeleteSilence = () => {
  return mount(
    <DeleteSilence
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      cluster={cluster}
      silence={silence}
    />
  );
};

const MountedDeleteSilenceModalContent = () => {
  return mount(
    <DeleteSilenceModalContent
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      cluster={cluster}
      silence={silence}
      onHide={MockOnHide}
    />
  );
};

const VerifyResponse = async response => {
  const tree = MountedDeleteSilenceModalContent();
  await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();

  fetch.mockResponseOnce(JSON.stringify(response));
  tree.find(".btn-danger").simulate("click");
  await expect(tree.instance().deleteState.fetch).resolves.toBeUndefined();

  return tree;
};

describe("<DeleteSilence />", () => {
  it("label is 'Delete' by default", () => {
    const tree = MountedDeleteSilence();
    expect(tree.text()).toBe("Delete");
  });

  it("opens modal on click", () => {
    const tree = MountedDeleteSilence();
    tree
      .find("button")
      .at(0)
      .simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);
  });

  it("button is disabled when all alertmanager instances are read-only", () => {
    alertStore.data.upstreams.instances[0].readonly = true;
    const tree = MountedDeleteSilence();
    expect(tree.find("button").prop("disabled")).toBe(true);

    tree
      .find("button")
      .at(0)
      .simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(0);
  });
});

describe("<DeleteSilenceModalContent />", () => {
  it("blurs silence form on mount", () => {
    expect(silenceFormStore.toggle.blurred).toBe(false);
    MountedDeleteSilenceModalContent();
    expect(silenceFormStore.toggle.blurred).toBe(true);
  });

  it("unblurs silence form on unmount", () => {
    const tree = MountedDeleteSilenceModalContent();
    expect(silenceFormStore.toggle.blurred).toBe(true);
    tree.unmount();
    expect(silenceFormStore.toggle.blurred).toBe(false);
  });

  it("renders LabelSetList on mount", () => {
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.find("LabelSetList")).toHaveLength(1);
  });

  it("fetches affected alerts on mount", async () => {
    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalled();
  });

  it("renders ErrorMessage on failed fetch", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.resetMocks();
    fetch.mockReject(new Error("Fetch error"));

    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();
    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("renders ErrorMessage on fetch with non-JSON response", async () => {
    fetch.mockResponseOnce("not json");
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.resetMocks();
    fetch.mockReject(new Error("Fetch error"));

    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();
    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("[v1] sends a DELETE request after clicking 'Confirm' button", async () => {
    await VerifyResponse({ status: "success" });
    expect(fetch.mock.calls[1][0]).toBe(
      "http://localhost:9093/api/v1/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  });

  it("[v2] sends a DELETE request after clicking 'Confirm' button", async () => {
    alertStore.data.upstreams.instances[0].version = "0.16.2";
    await VerifyResponse({ status: "success" });
    expect(fetch.mock.calls[1][0]).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  });

  it("[v1] sends headers from alertmanager config", async () => {
    alertStore.data.upstreams.instances[0].headers = {
      Authorization: "Basic ***"
    };
    await VerifyResponse({ status: "success" });
    expect(fetch.mock.calls[1][0]).toBe(
      "http://localhost:9093/api/v1/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({
      credentials: "include",
      method: "DELETE",
      headers: { Authorization: "Basic ***" }
    });
  });

  it("[v1] sends headers from alertmanager config", async () => {
    alertStore.data.upstreams.instances[0].headers = {
      Authorization: "Basic ***"
    };
    alertStore.data.upstreams.instances[0].version = "0.16.2";
    await VerifyResponse({ status: "success" });
    expect(fetch.mock.calls[1][0]).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({
      credentials: "include",
      method: "DELETE",
      headers: { Authorization: "Basic ***" }
    });
  });

  it("'Confirm' button is no-op after successful DELETE", async () => {
    const tree = await VerifyResponse({ status: "success" });
    expect(fetch.mock.calls[1][0]).toBe(
      "http://localhost:9093/api/v1/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "DELETE" });

    expect(fetch.mock.calls).toHaveLength(2);
    tree.find(".btn-danger").simulate("click");
    expect(fetch.mock.calls).toHaveLength(2);
    tree.instance().onDelete();
    expect(fetch.mock.calls).toHaveLength(2);
  });

  it("renders SuccessMessage on 'success' response status", async () => {
    const tree = await VerifyResponse({ status: "success" });
    tree.update();
    expect(tree.find("SuccessMessage")).toHaveLength(1);
  });

  it("renders ErrorMessage on 'error' response status", async () => {
    const tree = await VerifyResponse({ status: "error", error: "fake error" });
    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("renders ErrorMessage on unhandled response status", async () => {
    const tree = await VerifyResponse({ status: "foo bar" });
    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("renders ErrorMessage on unhandled response body", async () => {
    const tree = await VerifyResponse({ foo: "bar" });
    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("[v1] renders ErrorMessage on failed fetch request", async () => {
    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();

    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.resetMocks();
    fetch.mockReject(new Error("Fetch error"));

    tree.find(".btn-danger").simulate("click");
    await expect(tree.instance().deleteState.fetch).resolves.toBeUndefined();

    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("[v2] renders ErrorMessage on failed fetch request", async () => {
    alertStore.data.upstreams.instances[0].version = "0.16.2";
    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();

    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.resetMocks();
    fetch.mockResponseOnce("500 Internal Server Error", { status: 500 });

    tree.find(".btn-danger").simulate("click");
    await expect(tree.instance().deleteState.fetch).resolves.toBeUndefined();

    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });
});

import React from "react";

import { mount } from "enzyme";

import { EmptyAPIResponse } from "__mocks__/Fetch";
import { MockAlertGroup, MockAlert, MockAlertmanager } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { DeleteSilence, DeleteSilenceModalContent } from "./DeleteSilence";

let alertmanager;
let alertStore;

beforeEach(() => {
  alertmanager = MockAlertmanager();
  alertStore = new AlertStore([]);
  fetch.mockResponseOnce(JSON.stringify(MockAPIResponse()));

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
      { job: "foo" }
    )
  };
  return response;
};

const MountedDeleteSilence = () => {
  return mount(
    <DeleteSilence
      alertStore={alertStore}
      alertmanager={alertmanager}
      silenceID="123456789"
    />
  );
};

const MountedDeleteSilenceModalContent = () => {
  return mount(
    <DeleteSilenceModalContent
      alertStore={alertStore}
      alertmanager={alertmanager}
      silenceID="123456789"
      onHide={MockOnHide}
    />
  );
};

const VerifyResponse = async response => {
  const tree = MountedDeleteSilenceModalContent();
  await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();

  fetch.mockResponseOnce(JSON.stringify(response));
  tree.find(".btn-outline-danger").simulate("click");
  await expect(tree.instance().deleteState.fetch).resolves.toBeUndefined();

  return tree;
};

describe("<DeleteSilence />", async () => {
  it("label is 'Delete' by default", () => {
    const tree = MountedDeleteSilence();
    expect(tree.text()).toBe("Delete");
  });

  it("opens modal on click", async () => {
    const tree = MountedDeleteSilence();
    tree.simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);
  });
});

describe("<DeleteSilenceModalContent />", () => {
  it("renders LabelSetList on mount", async () => {
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.find("LabelSetList")).toHaveLength(1);
  });

  it("fetches affected alerts on mount", async () => {
    MountedDeleteSilenceModalContent();
    expect(fetch).toHaveBeenCalled();
  });

  it("renders ErrorMessage on failed fetch", async () => {
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.resetMocks();
    fetch.mockReject("Fetch error");

    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();
    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("renders ErrorMessage on fetch with non-JSON response", async () => {
    fetch.mockResponseOnce("not json");
    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.resetMocks();
    fetch.mockReject("Fetch error");

    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();
    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("sends a DELETE request after clicking 'Confirm' button", async () => {
    await VerifyResponse({ status: "success" });
    expect(fetch.mock.calls[1][0]).toBe(
      "http://am.example.com/api/v1/silence/123456789"
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  });

  it("'Confirm' button is no-op after successful DELETE", async () => {
    const tree = await VerifyResponse({ status: "success" });
    expect(fetch.mock.calls[1][0]).toBe(
      "http://am.example.com/api/v1/silence/123456789"
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "DELETE" });

    expect(fetch.mock.calls).toHaveLength(2);
    tree.find(".btn-outline-danger").simulate("click");
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

  it("renders ErrorMessage on failed fetch request", async () => {
    const tree = MountedDeleteSilenceModalContent();
    await expect(tree.instance().previewState.fetch).resolves.toBeUndefined();

    jest.spyOn(console, "trace").mockImplementation(() => {});
    fetch.resetMocks();
    fetch.mockReject("Fetch error");

    tree.find(".btn-outline-danger").simulate("click");
    await expect(tree.instance().deleteState.fetch).resolves.toBeUndefined();

    tree.update();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });
});

import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import moment from "moment";

import { EmptyAPIResponse } from "__mocks__/Fetch";
import { MockSilence } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { useFetchGet } from "Hooks/useFetchGet";
import { useFetchDelete } from "Hooks/useFetchDelete";
import { DeleteSilence, DeleteSilenceModalContent } from "./DeleteSilence";

let alertStore;
let silenceFormStore;
let cluster;
let silence;

beforeEach(() => {
  advanceTo(moment.utc([2000, 0, 1, 0, 30, 0]));
  jest.useFakeTimers();

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();

  alertStore.data.upstreams = {
    instances: [
      {
        name: "am1",
        cluster: "am",
        uri: "http://localhost:9093",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
        corsCredentials: "include",
        clusterMembers: ["am1"],
      },
    ],
    clusters: { am: ["am1"] },
  };
});

afterEach(() => {
  jest.restoreAllMocks();
  useFetchGet.mockReset();
  useFetchDelete.mockReset();
  clear();
});

const MockOnHide = jest.fn();
const MockOnModalExit = jest.fn();

const MountedDeleteSilence = () => {
  return mount(
    <DeleteSilence
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      cluster={cluster}
      silence={silence}
      onModalExit={MockOnModalExit}
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

describe("<DeleteSilence />", () => {
  it("label is 'Delete' by default", () => {
    const tree = MountedDeleteSilence();
    expect(tree.text()).toBe("Delete");
  });

  it("opens modal on click", () => {
    const tree = MountedDeleteSilence();
    tree.find("button.btn-danger").simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);
  });

  it("closes modal on close button click", () => {
    const tree = MountedDeleteSilence();
    tree.find("button.btn-danger").simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);

    tree.find("button.close").simulate("click");
    act(() => jest.runOnlyPendingTimers());
    expect(MockOnModalExit).toHaveBeenCalled();
  });

  it("closes modal on esc button press", () => {
    const tree = MountedDeleteSilence();
    tree.find("button.btn-danger").simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);

    tree
      .find("div.modal")
      .simulate("keyDown", { key: "Escape", keyCode: 27, which: 27 });
    act(() => jest.runOnlyPendingTimers());
    expect(MockOnModalExit).toHaveBeenCalled();
  });

  it("button is disabled when all alertmanager instances are read-only", () => {
    alertStore.data.upstreams.instances[0].readonly = true;
    const tree = MountedDeleteSilence();
    expect(tree.find("button").prop("disabled")).toBe(true);

    tree.find("button").at(0).simulate("click");
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

  it("renders ProgressMessage while loading preview", () => {
    useFetchGet.mockReturnValue({
      response: null,
      error: false,
      isLoading: true,
      isRetrying: false,
    });
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.find("ProgressMessage")).toHaveLength(1);
  });

  it("renders LabelSetList with StaticLabel on mount", () => {
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.find("LabelSetList")).toHaveLength(1);
    expect(tree.find("StaticLabel")).toHaveLength(3);
  });

  it("renders empty LabelSetList with empty response", () => {
    useFetchGet.mockReturnValue({
      response: EmptyAPIResponse(),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.find("LabelSetList")).toHaveLength(1);
    expect(tree.find("StaticLabel")).toHaveLength(0);
  });

  it("fetches affected alerts on mount", () => {
    MountedDeleteSilenceModalContent();
    expect(useFetchGet).toHaveBeenCalled();
  });

  it("renders StaticLabel after fetch", () => {
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.text()).toMatch(/Affected alerts/);
    expect(tree.find("StaticLabel")).toHaveLength(3);
  });

  it("handles empty grid response correctly", () => {
    useFetchGet.mockReturnValue({
      response: EmptyAPIResponse(),
      error: false,
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.text()).toMatch(/No alerts matched/);
  });

  it("renders ErrorMessage on failed preview fetch", () => {
    useFetchGet.mockReturnValue({
      response: null,
      error: "fake error",
      isLoading: false,
      isRetrying: false,
    });
    const tree = MountedDeleteSilenceModalContent();
    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("sends a DELETE request after clicking 'Confirm' button", () => {
    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(useFetchDelete.mock.calls[0][0]).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(useFetchDelete.mock.calls[0][1]).toMatchObject({
      headers: {},
      credentials: "include",
    });
  });

  it("sends headers from alertmanager config", () => {
    alertStore.data.upstreams.instances[0].headers = {
      Authorization: "Basic ***",
    };

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(useFetchDelete.mock.calls[0][0]).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(useFetchDelete.mock.calls[0][1]).toMatchObject({
      credentials: "include",
      headers: { Authorization: "Basic ***" },
    });
  });

  it("uses CORS credentials from alertmanager config", () => {
    alertStore.data.upstreams.instances[0].corsCredentials = "omit";

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(useFetchDelete.mock.calls[0][0]).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(useFetchDelete.mock.calls[0][1]).toMatchObject({
      credentials: "omit",
      headers: {},
    });
  });

  it("renders SuccessMessage on successful response status", () => {
    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find("SuccessMessage")).toHaveLength(1);
  });

  it("renders ErrorMessage on failed delete fetch request", () => {
    useFetchDelete.mockReturnValue({
      response: null,
      error: "failed",
      isDeleting: false,
    });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("'Retry' button is present after failed delete", () => {
    useFetchDelete.mockReturnValue({
      response: null,
      error: "fake error",
      isDeleting: false,
    });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find(".btn-danger").text()).toBe("Retry");
  });

  it("'Retry' button is not present after successful delete", () => {
    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find(".btn-danger")).toHaveLength(0);
  });

  it("Clicking 'Retry' button triggers new delete", () => {
    useFetchDelete.mockReturnValue({
      response: null,
      error: "fake error",
      isDeleting: false,
    });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");
    expect(useFetchDelete).toHaveBeenCalledTimes(1);

    advanceTo(moment.utc([2000, 0, 1, 0, 30, 1]));
    tree.find(".btn-danger").simulate("click");
    expect(useFetchDelete).toHaveBeenCalledTimes(2);
  });
});

import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__fixtures__/Alerts";
import { PressKey } from "__fixtures__/PressKey";
import { useFetchDelete } from "Hooks/useFetchDelete";
import { APISilenceT, APIAlertsResponseUpstreamsT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { DeleteSilence, DeleteSilenceModalContent } from "./DeleteSilence";

jest.mock("Hooks/useFetchDelete");

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;
let cluster: string;
let silence: APISilenceT;

const generateUpstreams = (): APIAlertsResponseUpstreamsT => ({
  counters: { total: 1, healthy: 1, failed: 0 },
  instances: [
    {
      name: "am1",
      cluster: "am",
      uri: "http://localhost:9093",
      publicURI: "http://localhost:9093",
      readonly: false,
      error: "",
      version: "0.17.0",
      headers: {},
      corsCredentials: "include",
      clusterMembers: ["am1"],
    },
  ],
  clusters: { am: ["am1"] },
});

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));
  jest.useFakeTimers();

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();

  alertStore.data.setUpstreams(generateUpstreams());
});

afterEach(() => {
  (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mockClear();

  jest.restoreAllMocks();
  clear();
  document.body.className = "";
});

const MockOnHide = jest.fn();

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
    const tree = mount(
      <DeleteSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        cluster={cluster}
        silence={silence}
      />
    );
    expect(tree.text()).toBe("Delete");
  });

  it("opens modal on click", () => {
    const tree = mount(
      <DeleteSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        cluster={cluster}
        silence={silence}
      />
    );
    tree.find("button.btn-danger").simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);
  });

  it("closes modal on close button click", () => {
    const tree = mount(
      <DeleteSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        cluster={cluster}
        silence={silence}
      />
    );
    tree.find("button.btn-danger").simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);

    tree.find("button.btn-close").simulate("click");
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find(".modal-body")).toHaveLength(0);
  });

  it("closes modal on esc button press", () => {
    const tree = mount(
      <DeleteSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        cluster={cluster}
        silence={silence}
      />
    );
    tree.find("button.btn-danger").simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(1);

    PressKey("Escape", 27);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    tree.update();
    expect(tree.find(".modal-body")).toHaveLength(0);
  });

  it("button is disabled when all alertmanager instances are read-only", () => {
    const upstreams = generateUpstreams();
    upstreams.instances[0].readonly = true;
    alertStore.data.setUpstreams(upstreams);

    const tree = mount(
      <DeleteSilence
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        cluster={cluster}
        silence={silence}
      />
    );
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
    act(() => {
      tree.unmount();
    });
    expect(silenceFormStore.toggle.blurred).toBe(false);
  });

  it("sends a DELETE request after clicking 'Confirm' button", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][0]
    ).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][1]
    ).toMatchObject({
      headers: {},
      credentials: "include",
    });
  });

  it("sends headers from alertmanager config", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const upstreams = generateUpstreams();
    upstreams.instances[0].headers = {
      Authorization: "Basic ***",
    };
    alertStore.data.setUpstreams(upstreams);

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][0]
    ).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][1]
    ).toMatchObject({
      credentials: "include",
      headers: { Authorization: "Basic ***" },
    });
  });

  it("uses CORS credentials from alertmanager config", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const upstreams = generateUpstreams();
    upstreams.instances[0].corsCredentials = "omit";
    alertStore.data.setUpstreams(upstreams);

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][0]
    ).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f"
    );
    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][1]
    ).toMatchObject({
      credentials: "omit",
      headers: {},
    });
  });

  it("renders ProgressMessage while awaiting response status", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: null, error: null, isDeleting: true });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find("ProgressMessage")).toHaveLength(1);
  });

  it("renders SuccessMessage on successful response status", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find("SuccessMessage")).toHaveLength(1);
  });

  it("renders ErrorMessage on failed delete fetch request", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({
      response: null,
      error: "failed",
      isDeleting: false,
    });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find("ErrorMessage")).toHaveLength(1);
  });

  it("'Retry' button is present after failed delete", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({
      response: null,
      error: "fake error",
      isDeleting: false,
    });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find(".btn-danger").text()).toBe("Retry");
  });

  it("'Retry' button is not present after successful delete", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");

    expect(tree.find(".btn-danger")).toHaveLength(0);
  });

  it("Clicking 'Retry' button triggers new delete", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({
      response: null,
      error: "fake error",
      isDeleting: false,
    });

    const tree = MountedDeleteSilenceModalContent();
    tree.find(".btn-danger").simulate("click");
    expect(useFetchDelete).toHaveBeenCalledTimes(1);

    advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 1)));
    tree.find(".btn-danger").simulate("click");
    expect(useFetchDelete).toHaveBeenCalledTimes(2);
  });
});

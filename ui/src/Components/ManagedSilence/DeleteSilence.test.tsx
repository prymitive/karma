import { act } from "react-dom/test-utils";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { MockSilence } from "__fixtures__/Alerts";
import { PressKey } from "__fixtures__/PressKey";
import { useFetchDelete } from "Hooks/useFetchDelete";
import type { APISilenceT, APIAlertsResponseUpstreamsT } from "Models/APITypes";
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
      version: "0.24.0",
      headers: {},
      corsCredentials: "include",
      clusterMembers: ["am1"],
    },
  ],
  clusters: { am: ["am1"] },
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));

  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();

  alertStore.data.setUpstreams(generateUpstreams());
});

afterEach(() => {
  (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mockClear();

  jest.restoreAllMocks();
  jest.useRealTimers();
  document.body.className = "";
});

const MockOnHide = jest.fn();

const renderDeleteSilenceModalContent = () => {
  return render(
    <DeleteSilenceModalContent
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      cluster={cluster}
      silence={silence}
      onHide={MockOnHide}
    />,
  );
};

const renderDeleteSilence = () => {
  return render(
    <DeleteSilence
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      cluster={cluster}
      silence={silence}
    />,
  );
};

describe("<DeleteSilence />", () => {
  it("label is 'Delete' by default", () => {
    renderDeleteSilence();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("opens modal on click", () => {
    const { container } = renderDeleteSilence();
    const button = container.querySelector("button.btn-danger");
    fireEvent.click(button!);
    expect(document.body.querySelector(".modal-body")).toBeInTheDocument();
  });

  it("closes modal on close button click", async () => {
    const { container } = renderDeleteSilence();
    const button = container.querySelector("button.btn-danger");
    fireEvent.click(button!);
    expect(document.body.querySelector(".modal-body")).toBeInTheDocument();

    const closeBtn = document.body.querySelector("button.btn-close");
    fireEvent.click(closeBtn!);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(
        document.body.querySelector(".modal-body"),
      ).not.toBeInTheDocument();
    });
  });

  it("closes modal on esc button press", async () => {
    const { container } = renderDeleteSilence();
    const button = container.querySelector("button.btn-danger");
    fireEvent.click(button!);
    expect(document.body.querySelector(".modal-body")).toBeInTheDocument();

    PressKey("Escape", 27);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(container.querySelector(".modal-body")).not.toBeInTheDocument();
    });
  });

  it("button is disabled when all alertmanager instances are read-only", () => {
    const upstreams = generateUpstreams();
    upstreams.instances[0].readonly = true;
    alertStore.data.setUpstreams(upstreams);

    const { container } = renderDeleteSilence();
    const button = container.querySelector("button");
    expect(button?.disabled).toBe(true);

    fireEvent.click(button!);
    expect(container.querySelector(".modal-body")).not.toBeInTheDocument();
  });
});

describe("<DeleteSilenceModalContent />", () => {
  it("blurs silence form on mount", () => {
    expect(silenceFormStore.toggle.blurred).toBe(false);
    renderDeleteSilenceModalContent();
    expect(silenceFormStore.toggle.blurred).toBe(true);
  });

  it("unblurs silence form on unmount", () => {
    const { unmount } = renderDeleteSilenceModalContent();
    expect(silenceFormStore.toggle.blurred).toBe(true);
    act(() => {
      unmount();
    });
    expect(silenceFormStore.toggle.blurred).toBe(false);
  });

  it("sends a DELETE request after clicking 'Confirm' button", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][0],
    ).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f",
    );
    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][1],
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

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][0],
    ).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f",
    );
    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][1],
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

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][0],
    ).toBe(
      "http://localhost:9093/api/v2/silence/04d37636-2350-4878-b382-e0b50353230f",
    );
    expect(
      (useFetchDelete as jest.MockedFunction<typeof useFetchDelete>).mock
        .calls[0][1],
    ).toMatchObject({
      credentials: "omit",
      headers: {},
    });
  });

  it("renders ProgressMessage while awaiting response status", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: null, error: null, isDeleting: true });

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(container.querySelector(".fa-circle-notch")).toBeInTheDocument();
  });

  it("renders SuccessMessage on successful response status", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(screen.getByText(/Silence deleted/)).toBeInTheDocument();
  });

  it("renders ErrorMessage on failed delete fetch request", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({
      response: null,
      error: "failed",
      isDeleting: false,
    });

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("'Retry' button is present after failed delete", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({
      response: null,
      error: "fake error",
      isDeleting: false,
    });

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("'Retry' button is not present after successful delete", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({ response: "success", error: null, isDeleting: false });

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);

    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("Clicking 'Retry' button triggers new delete", () => {
    (
      useFetchDelete as jest.MockedFunction<typeof useFetchDelete>
    ).mockReturnValue({
      response: null,
      error: "fake error",
      isDeleting: false,
    });

    const { container } = renderDeleteSilenceModalContent();
    const button = container.querySelector(".btn-danger");
    fireEvent.click(button!);
    expect(useFetchDelete).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 1)));
    const retryBtn = screen.getByText("Retry");
    fireEvent.click(retryBtn);
    expect(useFetchDelete).toHaveBeenCalledTimes(2);
  });
});

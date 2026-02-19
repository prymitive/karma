import { render, fireEvent } from "@testing-library/react";

import { useFetchAny } from "Hooks/useFetchAny";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore, NewClusterRequest } from "Stores/SilenceFormStore";
import SilenceSubmitController from "./SilenceSubmitController";
import SingleClusterStatus from "./SingleClusterStatus";
import MultiClusterStatus from "./MultiClusterStatus";

jest.mock("Hooks/useFetchAny");

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();

  (useFetchAny as jest.MockedFunction<typeof useFetchAny>).mockReturnValue({
    response: null,
    error: null,
    inProgress: true,
    responseURI: null,
    reset: jest.fn(),
  });

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
        version: "0.24.0",
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
        version: "0.24.0",
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
        version: "0.24.0",
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

    const { container } = render(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelectorAll("table")).toHaveLength(1);
  });

  it("renders SingleClusterStatus when single cluster is used", () => {
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
    });

    const { container } = render(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelectorAll("table")).toHaveLength(0);
    expect(container.querySelectorAll(".display-1")).toHaveLength(1);
  });

  it("resets the form on 'Back' button click", () => {
    silenceFormStore.data.setStage("submit");
    const { container } = render(
      <SilenceSubmitController
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    const button = container.querySelector("button");
    fireEvent.click(button!);
    expect(silenceFormStore.data.currentStage).toBe("form");
  });
});

describe("<MultiClusterStatus />", () => {
  it("renders all passed SilenceSubmitProgress", () => {
    silenceFormStore.data.setRequestsByCluster({
      ha: NewClusterRequest("ha", ["am1", "am2"]),
      single: NewClusterRequest("single", ["single"]),
    });
    const { container } = render(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelectorAll("tr")).toHaveLength(2);
  });

  it("renders spinner for pending requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const { container } = render(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelectorAll("tr")).toHaveLength(1);
    const tds = container.querySelectorAll("td");
    expect(tds[0].innerHTML).toMatch(/fa-circle-notch/);
    expect(tds[1].textContent).toBe("single");
    expect(tds[2].textContent).toBe("");
  });

  it("renders error for failed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.error = "fake error";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const { container } = render(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelectorAll("tr")).toHaveLength(1);
    const tds = container.querySelectorAll("td");
    expect(tds[0].innerHTML).toMatch(/fa-circle-exclamation/);
    expect(tds[1].textContent).toBe("single");
    expect(tds[2].textContent).toBe("fake error");
  });

  it("renders silence link for completed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.silenceID = "123456789";
    single.silenceLink = "http://localhost";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const { container } = render(
      <MultiClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelectorAll("tr")).toHaveLength(1);
    const tds = container.querySelectorAll("td");
    expect(tds[0].innerHTML).toMatch(/fa-circle-check/);
    expect(tds[1].textContent).toBe("single");
    expect(tds[2].textContent).toBe("123456789");
    expect(
      tds[2].querySelector('a[href="http://localhost"]'),
    ).toBeInTheDocument();
  });
});

describe("<SingleClusterStatus />", () => {
  it("renders spinner for pending requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const { container } = render(
      <SingleClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelector("div.display-1")?.innerHTML).toMatch(
      /fa-circle-notch/,
    );
    expect(container.querySelector("div.badge.bg-primary")?.textContent).toBe(
      "single",
    );
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders error for failed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.error = "fake error";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const { container } = render(
      <SingleClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );
    expect(container.querySelector("div.display-1")?.innerHTML).toMatch(
      /fa-circle-exclamation/,
    );
    expect(container.querySelector("div.badge.bg-primary")?.textContent).toBe(
      "single",
    );
    expect(container.querySelector("p")?.textContent).toBe("fake error");
  });

  it("renders silence link for completed requests", () => {
    const single = NewClusterRequest("single", ["single"]);
    single.isDone = true;
    single.silenceID = "123456789";
    single.silenceLink = "http://localhost";
    silenceFormStore.data.setRequestsByCluster({ single: single });
    const { container } = render(
      <SingleClusterStatus
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
      />,
    );

    expect(container.querySelector("div.display-1")?.innerHTML).toMatch(
      /fa-circle-check/,
    );
    expect(container.querySelector("div.badge.bg-primary")?.textContent).toBe(
      "single",
    );
    expect(container.querySelector("p")?.textContent).toBe("123456789");
    expect(
      container.querySelector('p a[href="http://localhost"]'),
    ).toBeInTheDocument();
  });
});

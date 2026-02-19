import { render, fireEvent } from "@testing-library/react";

import copy from "copy-to-clipboard";

import { MockSilence } from "__fixtures__/Alerts";
import type { APIAlertsResponseUpstreamsT, APISilenceT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceDetails } from "./SilenceDetails";

let alertStore: AlertStore;
let silenceFormStore: SilenceFormStore;
let cluster: string;
let silence: APISilenceT;

const MockEditSilence = jest.fn();

const generateUpstreams = (): APIAlertsResponseUpstreamsT => ({
  counters: { total: 1, healthy: 1, failed: 0 },
  instances: [
    {
      name: "am1",
      cluster: "am",
      clusterMembers: ["am"],
      uri: "http://localhost:9093",
      publicURI: "http://example.com",
      readonly: false,
      error: "",
      version: "0.24.0",
      headers: {},
      corsCredentials: "include",
    },
  ],
  clusters: { am: ["am1"] },
});

beforeEach(() => {
  alertStore = new AlertStore([]);
  silenceFormStore = new SilenceFormStore();
  cluster = "am";
  silence = MockSilence();

  alertStore.data.setUpstreams(generateUpstreams());

  jest.restoreAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const renderSilenceDetails = () => {
  return render(
    <SilenceDetails
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      silence={silence}
      cluster={cluster}
      onEditSilence={MockEditSilence}
    />,
  );
};

describe("<SilenceDetails />", () => {
  it("unexpired silence endsAt label doesn't use 'danger' class", () => {
    jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));
    const { container } = renderSilenceDetails();
    const badges = container.querySelectorAll("span.badge");
    expect(badges[1]?.outerHTML).not.toMatch(/text-danger/);
  });

  it("expired silence endsAt label uses 'danger' class", () => {
    jest.setSystemTime(new Date(Date.UTC(2000, 0, 1, 23, 0, 0)));
    const { container } = renderSilenceDetails();
    const badges = container.querySelectorAll("span.badge");
    expect(badges[1]?.outerHTML).toMatch(/text-danger/);
  });

  it("id links to Alertmanager silence view via alertmanager.publicURI", () => {
    const { container } = renderSilenceDetails();
    const link = container.querySelector("a");
    expect(link?.href).toBe(
      "http://example.com/#/silences/04d37636-2350-4878-b382-e0b50353230f",
    );
  });

  it("clicking on the copy button copies silence ID to the clipboard", () => {
    const { container } = renderSilenceDetails();
    const button = container.querySelector("span.badge.bg-secondary");
    fireEvent.click(button!);
    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith(silence.id);
  });

  it("Edit silence button is disabled when all alertmanager instances are read-only", () => {
    const upstreams = generateUpstreams();
    upstreams.instances[0].readonly = true;
    alertStore.data.setUpstreams(upstreams);
    const { container } = renderSilenceDetails();
    const button = container.querySelector("button");
    expect(button?.disabled).toBe(true);

    fireEvent.click(button!);
    expect(container.querySelector(".modal-body")).not.toBeInTheDocument();
  });
});

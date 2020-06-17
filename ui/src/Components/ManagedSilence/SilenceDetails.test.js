import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import copy from "copy-to-clipboard";

import { advanceTo, clear } from "jest-date-mock";

import { MockSilence } from "__mocks__/Alerts";
import { AlertStore } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilenceDetails } from "./SilenceDetails";

let alertStore;
let silenceFormStore;
let cluster;
let silence;

const MockEditSilence = jest.fn();

beforeEach(() => {
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
        publicURI: "http://example.com",
        readonly: false,
        error: "",
        version: "0.17.0",
        headers: {},
        corsCredentials: "include",
      },
    ],
    clusters: { am: ["am1"] },
  };

  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  // reset Date() to current time
  clear();
});

const MountedSilenceDetails = () => {
  return mount(
    <SilenceDetails
      alertStore={alertStore}
      silenceFormStore={silenceFormStore}
      silence={silence}
      cluster={cluster}
      onEditSilence={MockEditSilence}
    />
  );
};

describe("<SilenceDetails />", () => {
  it("unexpired silence endsAt label doesn't use 'danger' class", () => {
    advanceTo(new Date(Date.UTC(2000, 0, 1, 0, 30, 0)));
    const tree = MountedSilenceDetails();
    const endsAt = tree.find("span.badge").at(1);
    expect(toDiffableHtml(endsAt.html())).not.toMatch(/text-danger/);
  });

  it("expired silence endsAt label uses 'danger' class", () => {
    advanceTo(new Date(Date.UTC(2000, 0, 1, 23, 0, 0)));
    const tree = MountedSilenceDetails();
    const endsAt = tree.find("span.badge").at(1);
    expect(toDiffableHtml(endsAt.html())).toMatch(/text-danger/);
  });

  it("id links to Alertmanager silence view via alertmanager.publicURI", () => {
    const tree = MountedSilenceDetails();
    const link = tree.find("a");
    expect(link.props().href).toBe(
      "http://example.com/#/silences/04d37636-2350-4878-b382-e0b50353230f"
    );
  });

  it("clicking on the copy button copies silence ID to the clipboard", () => {
    const tree = MountedSilenceDetails();
    const button = tree.find("span.badge.badge-secondary");
    button.simulate("click");
    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith(silence.id);
  });

  it("Edit silence button is disabled when all alertmanager instances are read-only", () => {
    alertStore.data.upstreams.instances[0].readonly = true;
    const tree = MountedSilenceDetails();
    expect(tree.find("button").prop("disabled")).toBe(true);

    tree.find("button").at(0).simulate("click");
    expect(tree.find(".modal-body")).toHaveLength(0);
  });
});

import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { FetchIndicator } from ".";
import { AlertStore } from "Stores/AlertStore";

let alertStore;

beforeEach(() => {
  alertStore = new AlertStore([]);
});

const MountedFetchIndicator = () => {
  return mount(<FetchIndicator alertStore={alertStore} />);
};

describe("<FetchIndicator />", () => {
  it("shows a pause icon when fetching is paused", () => {
    alertStore.status.pause();
    const tree = MountedFetchIndicator();
    expect(toDiffableHtml(tree.html())).toMatch(/fa-pause-circle/);
  });

  it("shows a cirle notch icon when fetching is resumed", () => {
    alertStore.status.resume();
    const tree = MountedFetchIndicator();
    expect(toDiffableHtml(tree.html())).toMatch(/fa-circle-notch/);
  });

  it("opacity is 1 when fetch is in progress", () => {
    alertStore.status.setFetching();
    const tree = MountedFetchIndicator();
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(1);
  });

  it("uses text-muted when fetch is in progress", () => {
    alertStore.status.setFetching();
    const tree = MountedFetchIndicator();
    expect(tree.find("FontAwesomeIcon").hasClass("text-muted")).toBe(true);
  });

  it("uses text-danger when we need to retry fetch", () => {
    alertStore.info.setIsRetrying();
    alertStore.status.setFetching();
    const tree = MountedFetchIndicator();
    expect(tree.find("FontAwesomeIcon").hasClass("text-danger")).toBe(true);
  });

  it("opacity is 1 when response is processed", () => {
    alertStore.status.setProcessing();
    const tree = MountedFetchIndicator();
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(1);
  });

  it("uses text-success when response is processed", () => {
    alertStore.status.setProcessing();
    const tree = MountedFetchIndicator();
    expect(tree.find("FontAwesomeIcon").hasClass("text-success")).toBe(true);
  });

  it("opacity is 0 when idle", () => {
    alertStore.status.setIdle();
    const tree = MountedFetchIndicator();
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(0);
  });

  it("opacity is 0 when fetch failed", () => {
    alertStore.status.setFailure();
    const tree = MountedFetchIndicator();
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(0);
  });

  it("matches snapshot when paused", () => {
    alertStore.status.pause();
    const tree = MountedFetchIndicator();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when fetch is in progress", () => {
    alertStore.status.setFetching();
    const tree = MountedFetchIndicator();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when response is processed", () => {
    alertStore.status.setProcessing();
    const tree = MountedFetchIndicator();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when idle", () => {
    alertStore.status.setIdle();
    const tree = MountedFetchIndicator();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

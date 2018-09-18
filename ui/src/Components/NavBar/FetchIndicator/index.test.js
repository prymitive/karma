import React from "react";

import { mount } from "enzyme";

import toDiffableHtml from "diffable-html";

import { FetchIndicator } from ".";
import { AlertStoreStatuses } from "Stores/AlertStore";

describe("<FetchIndicator />", () => {
  it("opacity is 1 when fetch is in progress", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Fetching.toString()} />
    );
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(1);
  });

  it("uses text-muted when fetch is in progress", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Fetching.toString()} />
    );
    expect(tree.find("FontAwesomeIcon").hasClass("text-muted")).toBe(true);
  });

  it("opacity is 1 when response is processed", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Processing.toString()} />
    );
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(1);
  });

  it("uses text-success when response is processed", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Processing.toString()} />
    );
    expect(tree.find("FontAwesomeIcon").hasClass("text-success")).toBe(true);
  });

  it("opacity is 0 when idle", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Idle.toString()} />
    );
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(0);
  });

  it("opacity is 0 when fetch failed", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Failure.toString()} />
    );
    expect(tree.find("FontAwesomeIcon").props().style.opacity).toEqual(0);
  });

  it("matches snapshot when fetch is in progress", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Fetching.toString()} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when response is processed", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Processing.toString()} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("matches snapshot when idle", () => {
    const tree = mount(
      <FetchIndicator status={AlertStoreStatuses.Idle.toString()} />
    );
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

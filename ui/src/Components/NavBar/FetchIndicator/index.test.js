import React from "react";
import renderer from "react-test-renderer";

import { FetchIndicator } from ".";
import { AlertStoreStatuses } from "Stores/AlertStore";

describe("<FetchIndicator />", () => {
  it("opacity is 1 when fetch is in progress", () => {
    const tree = renderer
      .create(
        <FetchIndicator status={AlertStoreStatuses.InProgress.toString()} />
      )
      .toJSON();
    expect(tree.props.style.opacity).toEqual(1);
  });

  it("opacity is 0 when idle", () => {
    const tree = renderer
      .create(<FetchIndicator status={AlertStoreStatuses.Idle.toString()} />)
      .toJSON();
    expect(tree.props.style.opacity).toEqual(0);
  });

  it("opacity is 0 when fetch failed", () => {
    const tree = renderer
      .create(<FetchIndicator status={AlertStoreStatuses.Failure.toString()} />)
      .toJSON();
    expect(tree.props.style.opacity).toEqual(0);
  });

  it("matches snapshot when fetch is in progress", () => {
    const tree = renderer
      .create(
        <FetchIndicator status={AlertStoreStatuses.InProgress.toString()} />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("matches snapshot when idle", () => {
    const tree = renderer
      .create(<FetchIndicator status={AlertStoreStatuses.Idle.toString()} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});

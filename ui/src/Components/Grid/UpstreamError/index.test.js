import React from "react";
import renderer from "react-test-renderer";

import { UpstreamError } from ".";

describe("<UpstreamError />", () => {
  it("matches snapshot", () => {
    const tree = renderer
      .create(<UpstreamError name="foo" message="bar" />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});

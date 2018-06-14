import React from "react";
import renderer from "react-test-renderer";

import { FatalError } from ".";

describe("<FatalError />", () => {
  it("matches snapshot", () => {
    const tree = renderer.create(<FatalError message="foo bar" />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

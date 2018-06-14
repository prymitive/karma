import React from "react";
import renderer from "react-test-renderer";

import { BlankPage } from ".";

describe("<BlankPage />", () => {
  it("matches snapshot", () => {
    const tree = renderer.create(<BlankPage />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

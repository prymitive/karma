import React from "react";
import renderer from "react-test-renderer";

import { Help } from "./Help";

describe("<Help />", () => {
  it("matches snapshot", () => {
    const tree = renderer.create(<Help />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

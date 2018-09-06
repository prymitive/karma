import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { Help } from "./Help";

describe("<Help />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<Help />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

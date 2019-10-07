import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { EmptyGrid } from ".";

describe("<EmptyGrid />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<EmptyGrid />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

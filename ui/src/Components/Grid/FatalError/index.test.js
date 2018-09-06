import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { FatalError } from ".";

describe("<FatalError />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<FatalError message="foo bar" />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

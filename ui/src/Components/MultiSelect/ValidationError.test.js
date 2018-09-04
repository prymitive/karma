import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { ValidationError } from "./ValidationError";

describe("<ValidationError />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<ValidationError />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

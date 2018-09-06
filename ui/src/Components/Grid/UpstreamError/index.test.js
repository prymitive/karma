import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { UpstreamError } from ".";

describe("<UpstreamError />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<UpstreamError name="foo" message="bar" />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

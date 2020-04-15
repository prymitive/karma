import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__mocks__/Theme";
import { UpstreamError } from ".";

beforeAll(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

describe("<UpstreamError />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<UpstreamError name="foo" message="bar" />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

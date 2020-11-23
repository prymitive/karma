import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__fixtures__/Theme";
import { FatalError } from ".";

beforeEach(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

describe("<FatalError />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<FatalError message="foo bar" />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

import React from "react";

import { shallow } from "enzyme";

import toDiffableHtml from "diffable-html";

import { MockThemeContext } from "__mocks__/Theme";
import { FatalError } from ".";

beforeAll(() => {
  jest.spyOn(React, "useContext").mockImplementation(() => MockThemeContext);
});

describe("<FatalError />", () => {
  it("matches snapshot", () => {
    const tree = shallow(<FatalError message="foo bar" />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});

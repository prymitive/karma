import { shallow } from "enzyme";

import LightTheme from "./LightTheme";
import DarkTheme from "./DarkTheme";

describe("<LightTheme />", () => {
  it("renders null", () => {
    const tree = shallow(<LightTheme />);
    expect(tree.html()).toBeNull();
  });
});

describe("<DarkTheme />", () => {
  it("renders null", () => {
    const tree = shallow(<DarkTheme />);
    expect(tree.html()).toBeNull();
  });
});

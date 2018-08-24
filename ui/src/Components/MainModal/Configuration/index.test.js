import React from "react";

import { shallow } from "enzyme";

import { Settings } from "Stores/Settings";
import { Configuration } from ".";

describe("<Configuration />", () => {
  it("renders correctly", () => {
    const settingsStore = new Settings();
    const tree = shallow(<Configuration settingsStore={settingsStore} />);
    expect(tree.text()).toBe(
      "<FetchConfiguration /><AlertGroupConfiguration />"
    );
  });
});

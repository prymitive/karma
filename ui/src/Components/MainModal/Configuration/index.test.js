import React from "react";
import sd from "skin-deep";

import { Settings } from "Stores/Settings";
import { Configuration } from ".";

describe("<Configuration />", () => {
  it("renders correctly", () => {
    const settingsStore = new Settings();
    const tree = sd.shallowRender(
      <Configuration settingsStore={settingsStore} />
    );
    expect(tree.text()).toBe(
      "<FetchConfiguration /><AlertGroupConfiguration />"
    );
  });
});

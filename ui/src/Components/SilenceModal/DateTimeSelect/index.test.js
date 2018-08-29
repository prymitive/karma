import React from "react";

import { mount } from "enzyme";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import { DateTimeSelect } from ".";

let silenceFormStore;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
});

const MountedDateTimeSelect = () => {
  return mount(<DateTimeSelect silenceFormStore={silenceFormStore} />);
};

describe("<DateTimeSelect />", () => {
  it("renders 'Duration' tab by default", () => {
    const tree = MountedDateTimeSelect();
    const tab = tree.find(".nav-link.active");
    expect(tab).toHaveLength(1);
    expect(tab.text()).toMatch(/Duration/);
  });
});

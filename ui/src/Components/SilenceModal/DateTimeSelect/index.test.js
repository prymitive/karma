import React from "react";

import { mount, shallow } from "enzyme";

import moment from "moment";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import {
  DateTimeSelect,
  TabContentStart,
  TabContentEnd,
  TabContentDuration
} from ".";

let silenceFormStore;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  silenceFormStore.data.startsAt = moment([2060, 1, 1, 0, 0, 0]);
  silenceFormStore.data.endsAt = moment([2061, 1, 1, 0, 0, 0]);
});

const ShallowDateTimeSelect = () => {
  return shallow(<DateTimeSelect silenceFormStore={silenceFormStore} />);
};

const MountedDateTimeSelect = () => {
  return mount(<DateTimeSelect silenceFormStore={silenceFormStore} />);
};

describe("<DateTimeSelect />", () => {
  it("renders 3 tabs", () => {
    const tree = ShallowDateTimeSelect();
    const tabs = tree.find("Tab");
    expect(tabs).toHaveLength(3);
  });

  it("renders 'Duration' tab by default", () => {
    const tree = MountedDateTimeSelect();
    const tab = tree.find(".nav-link.active");
    expect(tab).toHaveLength(1);
    // check tab title
    expect(tab.text()).toMatch(/Duration/);
    // check tab content
    expect(tree.find(".tab-content").text()).toBe("366days0hours0minutes");
  });

  it("clicking on the 'Starts' tab switches content to 'startsAt' selection", () => {
    const tree = MountedDateTimeSelect();
    const tab = tree.find(".nav-link").at(0);
    expect(tab.text()).toMatch(/Starts/);
    tab.simulate("click");
    expect(tree.find(".tab-content").text()).toMatch(/2060/);
  });

  it("clicking on the 'Ends' tab switches content to 'endsAt' selection", () => {
    const tree = MountedDateTimeSelect();
    const tab = tree.find(".nav-link").at(1);
    expect(tab.text()).toMatch(/Ends/);
    tab.simulate("click");
    expect(tree.find(".tab-content").text()).toMatch(/2061/);
  });

  it("clicking on the 'Duration' tabs switches content to duration selection", () => {
    const tree = MountedDateTimeSelect();
    // first switch to 'Starts'
    tree
      .find(".nav-link")
      .at(0)
      .simulate("click");
    // then switch back to 'Duration'
    const tab = tree.find(".nav-link").at(2);
    expect(tab.text()).toMatch(/Duration/);
    tab.simulate("click");
    expect(tree.find(".tab-content").text()).toBe("366days0hours0minutes");
  });
});

const ValidateTimeButton = (
  tab,
  storeKey,
  elemIndex,
  iconMatch,
  expectedDiff
) => {
  const button = tab.find("td > span").at(elemIndex);
  expect(button.html()).toMatch(iconMatch);

  const oldTimeValue = moment(silenceFormStore.data[storeKey]);
  button.simulate("click");
  expect(silenceFormStore.data[storeKey].toISOString()).not.toBe(
    oldTimeValue.toISOString()
  );
  const diffMS = silenceFormStore.data[storeKey].diff(oldTimeValue);
  expect(diffMS).toBe(expectedDiff);
};

const ShallowTabContentStart = () => {
  return shallow(<TabContentStart silenceFormStore={silenceFormStore} />);
};

const MountedTabContentStart = () => {
  return mount(<TabContentStart silenceFormStore={silenceFormStore} />);
};

describe("<TabContentStart />", () => {
  it("selecting date on DatePicker updates startsAt", () => {
    const tree = ShallowTabContentStart();
    const picker = tree.find("DatePicker");
    const startsAt = moment([2063, 10, 10, 0, 1, 2]);
    picker.simulate("change", startsAt);
    expect(silenceFormStore.data.startsAt.toISOString()).toBe(
      startsAt.toISOString()
    );
  });

  it("clicking on the hour inc button adds 1h to startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 0, /angle-up/, 3600 * 1000);
  });

  it("clicking on the minute inc button adds 1m to startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 1, /angle-up/, 60 * 1000);
  });

  it("clicking on the hour dec button subtracts 1h from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 2, /angle-down/, -1 * 3600 * 1000);
  });

  it("clicking on the minute dec button subtracts 1m from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 3, /angle-down/, -1 * 60 * 1000);
  });
});

const ShallowTabContentEnd = () => {
  return shallow(<TabContentEnd silenceFormStore={silenceFormStore} />);
};

const MountedTabContentEnd = () => {
  return mount(<TabContentEnd silenceFormStore={silenceFormStore} />);
};

describe("<TabContentEnd />", () => {
  it("Selecting date on DatePicker updates endsAt", () => {
    const tree = ShallowTabContentEnd();
    const picker = tree.find("DatePicker");
    const endsAt = moment([2063, 11, 5, 1, 3, 2]);
    picker.simulate("change", endsAt);
    expect(silenceFormStore.data.endsAt.toISOString()).toBe(
      endsAt.toISOString()
    );
  });

  it("clicking on the hour inc button adds 1h to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 0, /angle-up/, 3600 * 1000);
  });

  it("clicking on the minute inc button adds 1m to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 1, /angle-up/, 60 * 1000);
  });

  it("clicking on the hour dec button subtracts 1h from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 2, /angle-down/, -1 * 3600 * 1000);
  });

  it("clicking on the minute dec button subtracts 1m from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 3, /angle-down/, -1 * 60 * 1000);
  });
});

const ValidateDurationButton = (elemIndex, iconMatch, expectedDiff) => {
  const tree = mount(
    <TabContentDuration silenceFormStore={silenceFormStore} />
  );
  const button = tree.find("td > span").at(elemIndex);
  expect(button.html()).toMatch(iconMatch);

  const oldEndsAt = moment(silenceFormStore.data.endsAt);
  button.simulate("click");
  expect(silenceFormStore.data.endsAt.toISOString()).not.toBe(
    oldEndsAt.toISOString()
  );
  const diffMS = silenceFormStore.data.endsAt.diff(oldEndsAt);
  expect(diffMS).toBe(expectedDiff);
};

describe("<TabContentDuration />", () => {
  it("clicking on the day inc button adds 1d to endsAt", () => {
    ValidateDurationButton(0, /angle-up/, 24 * 3600 * 1000);
  });

  it("clicking on the day dec button subtracts 1d from endsAt", () => {
    ValidateDurationButton(2, /angle-down/, -1 * 24 * 3600 * 1000);
  });

  it("clicking on the hour inc button adds 1h to endsAt", () => {
    ValidateDurationButton(3, /angle-up/, 3600 * 1000);
  });

  it("clicking on the hour dec button subtracts 1h from endsAt", () => {
    ValidateDurationButton(5, /angle-down/, -1 * 3600 * 1000);
  });

  it("clicking on the minute inc button adds 5m to endsAt", () => {
    ValidateDurationButton(6, /angle-up/, 5 * 60 * 1000);
  });

  it("clicking on the minute dec button subtracts 5m from endsAt", () => {
    ValidateDurationButton(8, /angle-down/, -1 * 5 * 60 * 1000);
  });
});

import { act } from "react-dom/test-utils";

import { mount, shallow } from "enzyme";

import { advanceTo, clear } from "jest-date-mock";

import toDiffableHtml from "diffable-html";

import addMinutes from "date-fns/addMinutes";
import addHours from "date-fns/addHours";
import differenceInMilliseconds from "date-fns/differenceInMilliseconds";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import {
  DateTimeSelect,
  TabContentStart,
  TabContentEnd,
  TabContentDuration,
} from ".";

let silenceFormStore: SilenceFormStore;

beforeEach(() => {
  silenceFormStore = new SilenceFormStore();
  silenceFormStore.data.setStart(new Date(2060, 1, 1, 0, 0, 0));
  silenceFormStore.data.setEnd(new Date(2061, 1, 1, 0, 0, 0));
});

afterEach(() => {
  clear();
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

  it("'Duration' tab matches snapshot", () => {
    advanceTo(new Date(2060, 1, 1, 0, 0, 0));
    const tree = MountedDateTimeSelect();
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("'Duration' tab unmounts without crashing", () => {
    const tree = MountedDateTimeSelect();
    tree.unmount();
  });

  it("clicking on the 'Starts' tab switches content to 'startsAt' selection", () => {
    const tree = MountedDateTimeSelect();
    const tab = tree.find(".nav-link").at(0);
    expect(tab.text()).toMatch(/Starts/);
    tab.simulate("click");
    expect(tree.find(".tab-content").text()).toMatch(/2060/);
  });

  it("'Starts' tab matches snapshot", () => {
    advanceTo(new Date(2060, 1, 1, 0, 0, 0));
    const tree = MountedDateTimeSelect();
    tree.find(".nav-link").at(0).simulate("click");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("'Starts' tab unmounts without crashing", () => {
    const tree = MountedDateTimeSelect();
    tree.find(".nav-link").at(0).simulate("click");
    tree.unmount();
  });

  it("clicking on the 'Ends' tab switches content to 'endsAt' selection", () => {
    const tree = MountedDateTimeSelect();
    const tab = tree.find(".nav-link").at(1);
    expect(tab.text()).toMatch(/Ends/);
    tab.simulate("click");
    expect(tree.find(".tab-content").text()).toMatch(/2061/);
  });

  it("'Ends' tab matches snapshot", () => {
    advanceTo(new Date(2060, 1, 1, 0, 0, 0));
    const tree = MountedDateTimeSelect();
    tree.find(".nav-link").at(1).simulate("click");
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("'Ends' tab unmounts without crashing", () => {
    const tree = MountedDateTimeSelect();
    tree.find(".nav-link").at(1).simulate("click");
    tree.unmount();
  });

  it("clicking on the 'Duration' tabs switches content to duration selection", () => {
    const tree = MountedDateTimeSelect();
    // first switch to 'Starts'
    tree.find(".nav-link").at(0).simulate("click");
    // then switch back to 'Duration'
    const tab = tree.find(".nav-link").at(2);
    expect(tab.text()).toMatch(/Duration/);
    tab.simulate("click");
    expect(tree.find(".tab-content").text()).toBe("366days0hours0minutes");
  });

  it("'Ends' tab offset badge is updated after 1 minute", () => {
    jest.useFakeTimers();
    advanceTo(new Date(2060, 1, 1, 12, 0, 0));
    silenceFormStore.data.setStart(new Date(2060, 1, 1, 12, 0, 0));
    silenceFormStore.data.setEnd(new Date(2060, 1, 1, 13, 0, 0));

    const tree = MountedDateTimeSelect();
    expect(tree.find(".nav-link").at(1).text()).toBe("Endsin 1h ");

    advanceTo(new Date(2060, 1, 1, 12, 1, 0));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(tree.find(".nav-link").at(1).text()).toBe("Endsin 59m ");
  });

  it("unmounts cleanly", () => {
    const tree = MountedDateTimeSelect();
    tree.unmount();
  });
});

const ValidateTimeButton = (
  tab: any,
  storeKey: "startsAt" | "endsAt",
  elemIndex: number,
  iconMatch: RegExp,
  expectedDiff: number
) => {
  const button = tab.find("td > span").at(elemIndex);
  expect(button.html()).toMatch(iconMatch);

  const oldTimeValue = new Date(silenceFormStore.data[storeKey]);
  button.simulate("click");
  expect(silenceFormStore.data[storeKey].toISOString()).not.toBe(
    oldTimeValue.toISOString()
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data[storeKey],
    oldTimeValue
  );
  expect(diffMS).toBe(expectedDiff);
};

const ValidateTimeWheel = (
  tab: any,
  storeKey: "startsAt" | "endsAt",
  className: string,
  deltaY: number,
  expectedDiff: number
) => {
  const elem = tab.find(className);

  const oldTimeValue = new Date(silenceFormStore.data[storeKey]);

  elem.simulate("wheel", { deltaY: deltaY });
  // fire real event so cancel listener will trigger
  const event = new Event("wheel", { deltaY: deltaY } as EventInit);
  tab
    .find("div.components-hour-minute")
    .at(0)
    .getDOMNode()
    .dispatchEvent(event);

  expect(silenceFormStore.data[storeKey].toISOString()).not.toBe(
    oldTimeValue.toISOString()
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data[storeKey],
    oldTimeValue
  );
  expect(diffMS).toBe(expectedDiff);
};

const MountedTabContentStart = () => {
  return mount(<TabContentStart silenceFormStore={silenceFormStore} />);
};

describe("<TabContentStart />", () => {
  it("selecting date on DayPicker updates startsAt", () => {
    const tree = MountedTabContentStart();
    expect(silenceFormStore.data.startsAt.toISOString()).toBe(
      new Date(2060, 1, 1, 0, 0, 0).toISOString()
    );
    tree.find('div[aria-label="Wed Feb 18 2060"]').simulate("click");
    expect(silenceFormStore.data.startsAt.toISOString()).toBe(
      new Date(2060, 1, 18, 0, 0, 0).toISOString()
    );
  });

  it("clicking on the hour inc button adds 1h to startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 0, /angle-up/, 3600 * 1000);
  });

  it("scrolling up on the hour button adds 1h to startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(
      tree,
      "startsAt",
      "td.components-hour-up",
      -1,
      3600 * 1000
    );
  });

  it("clicking on the minute inc button adds 1m to startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 1, /angle-up/, 60 * 1000);
  });

  it("scrolling up on the minute button adds 1m to startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(
      tree,
      "startsAt",
      "td.components-minute-up",
      -2,
      60 * 1000
    );
  });

  it("clicking on the hour dec button subtracts 1h from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 2, /angle-down/, -1 * 3600 * 1000);
  });

  it("scrolling down on the hour button subtracts 1h from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(
      tree,
      "startsAt",
      "td.components-hour-down",
      1,
      -1 * 3600 * 1000
    );
  });

  it("scrolling up on the minute adds 1m to startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(tree, "startsAt", "td.components-minute", -2, 60 * 1000);
  });

  it("scrolling down on the minute subtracts 1m from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(
      tree,
      "startsAt",
      "td.components-minute",
      1,
      -1 * 60 * 1000
    );
  });

  it("clicking on the minute dec button subtracts 1m from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeButton(tree, "startsAt", 3, /angle-down/, -1 * 60 * 1000);
  });

  it("scrolling down by deltaY=2 on the minute button subtracts 1m from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(
      tree,
      "startsAt",
      "td.components-minute-down",
      2,
      -1 * 60 * 1000
    );
  });

  it("scrolling up on the minute subtracts 1m from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(tree, "startsAt", "td.components-minute", -50, 60 * 1000);
  });

  it("scrolling down by deltaY=1 on the minute subtracts 1m from startsAt", () => {
    const tree = MountedTabContentStart();
    ValidateTimeWheel(
      tree,
      "startsAt",
      "td.components-minute",
      1,
      -1 * 60 * 1000
    );
  });
});

const MountedTabContentEnd = () => {
  return mount(<TabContentEnd silenceFormStore={silenceFormStore} />);
};

describe("<TabContentEnd />", () => {
  it("Selecting date on DayPicker updates endsAt", () => {
    const tree = MountedTabContentEnd();
    expect(silenceFormStore.data.endsAt.toISOString()).toBe(
      new Date(2061, 1, 1, 0, 0, 0).toISOString()
    );
    tree.find('div[aria-label="Thu Feb 24 2061"]').simulate("click");
    expect(silenceFormStore.data.endsAt.toISOString()).toBe(
      new Date(2061, 1, 24, 0, 0, 0).toISOString()
    );
  });

  it("clicking on the hour inc button adds 1h to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 0, /angle-up/, 3600 * 1000);
  });

  it("scrolling up on the hour button adds 1h to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(tree, "endsAt", "td.components-hour-up", -1, 3600 * 1000);
  });

  it("scrolling up on the hour adds 1h to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(tree, "endsAt", "td.components-hour", -1, 3600 * 1000);
  });

  it("scrolling down on the hour subtracts 1h from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(
      tree,
      "endsAt",
      "td.components-hour",
      1,
      -1 * 3600 * 1000
    );
  });

  it("clicking on the minute inc button adds 1m to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 1, /angle-up/, 60 * 1000);
  });

  it("scrolling up on the minute button adds 1m to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(
      tree,
      "endsAt",
      "td.components-minute-up",
      -10,
      60 * 1000
    );
  });

  it("clicking on the hour dec button subtracts 1h from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 2, /angle-down/, -1 * 3600 * 1000);
  });

  it("scrolling down on the hour button subtracts 1h from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(
      tree,
      "endsAt",
      "td.components-hour-down",
      1,
      -1 * 3600 * 1000
    );
  });

  it("clicking on the minute dec button subtracts 1m from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeButton(tree, "endsAt", 3, /angle-down/, -1 * 60 * 1000);
  });

  it("scrolling down on the minute button subtracts 1m from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(
      tree,
      "endsAt",
      "td.components-minute-down",
      50,
      -1 * 60 * 1000
    );
  });

  it("scrolling up on the minute adds 1m to endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(tree, "endsAt", "td.components-minute", -10, 60 * 1000);
  });

  it("scrolling down on the minute subtracts 1m from endsAt", () => {
    const tree = MountedTabContentEnd();
    ValidateTimeWheel(
      tree,
      "endsAt",
      "td.components-minute",
      15,
      -1 * 60 * 1000
    );
  });
});

const ValidateDurationButton = (
  elemIndex: number,
  iconMatch: RegExp,
  expectedDiff: number
) => {
  const tree = mount(
    <TabContentDuration silenceFormStore={silenceFormStore} />
  );
  const button = tree.find("td > span").at(elemIndex);
  expect(button.html()).toMatch(iconMatch);

  const oldEndsAt = new Date(silenceFormStore.data.endsAt);
  button.simulate("click");
  expect(silenceFormStore.data.endsAt.toISOString()).not.toBe(
    oldEndsAt.toISOString()
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data.endsAt,
    oldEndsAt
  );
  expect(diffMS).toBe(expectedDiff);
};

const ValidateDurationWheel = (
  elemIndex: number,
  deltaY: number,
  expectedDiff: number
) => {
  const tree = mount(
    <TabContentDuration silenceFormStore={silenceFormStore} />
  );
  const elem = tree.find(".components-duration").at(elemIndex);

  const oldEndsAt = new Date(silenceFormStore.data.endsAt);

  elem.simulate("wheel", { deltaY: deltaY });
  // fire real event so cancel listener will trigger
  const event = new Event("wheel", { deltaY: deltaY } as EventInit);
  elem.getDOMNode().dispatchEvent(event);

  expect(silenceFormStore.data.endsAt.toISOString()).not.toBe(
    oldEndsAt.toISOString()
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data.endsAt,
    oldEndsAt
  );
  expect(diffMS).toBe(expectedDiff);
};

describe("<TabContentDuration />", () => {
  it("clicking on the day inc button adds 1d to endsAt", () => {
    ValidateDurationButton(0, /angle-up/, 24 * 3600 * 1000);
  });

  it("scrolling up on the day button adds 1d to endsAt", () => {
    ValidateDurationWheel(0, -1, 24 * 3600 * 1000);
  });

  it("clicking on the day dec button subtracts 1d from endsAt", () => {
    ValidateDurationButton(2, /angle-down/, -1 * 24 * 3600 * 1000);
  });

  it("scrolling down on the day button subtracts 1d from endsAt", () => {
    ValidateDurationWheel(0, 1, -1 * 24 * 3600 * 1000);
  });

  it("clicking on the hour inc button adds 1h to endsAt", () => {
    ValidateDurationButton(3, /angle-up/, 3600 * 1000);
  });

  it("scrolling up on the hour inc button adds 1h to endsAt", () => {
    ValidateDurationWheel(1, -2, 3600 * 1000);
  });

  it("clicking on the hour dec button subtracts 1h from endsAt", () => {
    ValidateDurationButton(5, /angle-down/, -1 * 3600 * 1000);
  });

  it("scrolling down on the hour dec button subtracts 1h from endsAt", () => {
    ValidateDurationWheel(1, 2, -1 * 3600 * 1000);
  });

  it("clicking on the minute inc button adds 5m to endsAt", () => {
    ValidateDurationButton(6, /angle-up/, 5 * 60 * 1000);
  });

  it("scrolling up on the minute inc button adds 5m to endsAt", () => {
    ValidateDurationWheel(2, -1, 5 * 60 * 1000);
  });

  it("clicking on the minute dec button subtracts 5m from endsAt", () => {
    ValidateDurationButton(8, /angle-down/, -1 * 5 * 60 * 1000);
  });

  it("scrolling down on the minute dec button subtracts 5m from endsAt", () => {
    ValidateDurationWheel(2, 1, -1 * 5 * 60 * 1000);
  });
});

const SetDurationTo = (hours: number, minutes: number) => {
  const startsAt = new Date(2060, 1, 1, 0, 0, 0);
  const endsAt = addMinutes(addHours(startsAt, hours), minutes);
  silenceFormStore.data.setStart(startsAt);
  silenceFormStore.data.setEnd(endsAt);
};

describe("<TabContentDuration /> inc minute CalculateChangeValue", () => {
  it("inc on 0:1:0 duration sets 0:1:5", () => {
    SetDurationTo(1, 0);
    ValidateDurationButton(6, /angle-up/, 5 * 60 * 1000);
  });

  it("inc on 0:1:1 duration sets 0:1:2", () => {
    SetDurationTo(1, 1);
    ValidateDurationButton(6, /angle-up/, 60 * 1000);
  });

  it("inc on 0:1:4 duration sets 0:1:5", () => {
    SetDurationTo(1, 4);
    ValidateDurationButton(6, /angle-up/, 60 * 1000);
  });

  it("inc on 0:1:5 duration sets 0:1:10", () => {
    SetDurationTo(1, 5);
    ValidateDurationButton(6, /angle-up/, 5 * 60 * 1000);
  });

  it("inc on 0:1:6 duration sets 0:1:10", () => {
    SetDurationTo(1, 6);
    ValidateDurationButton(6, /angle-up/, 4 * 60 * 1000);
  });

  it("inc on 0:0:55 duration sets 0:1:0", () => {
    SetDurationTo(0, 55);
    ValidateDurationButton(6, /angle-up/, 5 * 60 * 1000);
  });
});

describe("<TabContentDuration /> dec minute CalculateChangeValue", () => {
  it("inc on 0:1:0 duration sets 0:0:55", () => {
    SetDurationTo(1, 0);
    ValidateDurationButton(8, /angle-down/, -5 * 60 * 1000);
  });

  it("inc on 0:0:59 duration sets 0:0:55", () => {
    SetDurationTo(0, 59);
    ValidateDurationButton(8, /angle-down/, -4 * 60 * 1000);
  });

  it("inc on 0:0:56 duration sets 0:0:55", () => {
    SetDurationTo(0, 56);
    ValidateDurationButton(8, /angle-down/, -1 * 60 * 1000);
  });

  it("inc on 0:0:55 duration sets 0:0:50", () => {
    SetDurationTo(1, 0);
    ValidateDurationButton(8, /angle-down/, -5 * 60 * 1000);
  });

  it("inc on 0:1:10 duration sets 0:1:5", () => {
    SetDurationTo(1, 10);
    ValidateDurationButton(8, /angle-down/, -5 * 60 * 1000);
  });

  it("inc on 0:1:6 duration sets 0:1:5", () => {
    SetDurationTo(1, 6);
    ValidateDurationButton(8, /angle-down/, -1 * 60 * 1000);
  });

  it("inc on 0:1:5 duration sets 0:1:0", () => {
    SetDurationTo(1, 5);
    ValidateDurationButton(8, /angle-down/, -5 * 60 * 1000);
  });

  it("inc on 0:1:4 duration sets 0:1:3", () => {
    SetDurationTo(1, 4);
    ValidateDurationButton(8, /angle-down/, -1 * 60 * 1000);
  });

  it("inc on 0:1:1 duration sets 0:1:0", () => {
    SetDurationTo(1, 1);
    ValidateDurationButton(8, /angle-down/, -1 * 60 * 1000);
  });
});

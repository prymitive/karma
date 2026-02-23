import { act } from "react-dom/test-utils";

import { render, fireEvent } from "@testing-library/react";

import { addMinutes } from "date-fns/addMinutes";
import { addHours } from "date-fns/addHours";
import { differenceInMilliseconds } from "date-fns/differenceInMilliseconds";
import { format } from "date-fns";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import {
  DateTimeSelect,
  TabContentStart,
  TabContentEnd,
  TabContentDuration,
} from ".";

let silenceFormStore: SilenceFormStore;

beforeEach(() => {
  jest.useFakeTimers();

  silenceFormStore = new SilenceFormStore();
  silenceFormStore.data.setStart(new Date(2060, 1, 1, 0, 0, 0));
  silenceFormStore.data.setEnd(new Date(2061, 1, 1, 0, 0, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

const renderDateTimeSelect = () => {
  return render(<DateTimeSelect silenceFormStore={silenceFormStore} />);
};

describe("<DateTimeSelect />", () => {
  it("renders 3 tabs", () => {
    const { container } = renderDateTimeSelect();
    const tabs = container.querySelectorAll(".nav-link");
    expect(tabs).toHaveLength(3);
  });

  it("renders 'Duration' tab by default", () => {
    const { container } = renderDateTimeSelect();
    const tab = container.querySelector(".nav-link.active");
    expect(tab).toBeInTheDocument();
    expect(tab?.textContent).toMatch(/Duration/);
    expect(container.querySelector(".tab-content")?.textContent).toBe(
      "366days0hours0minutes",
    );
  });

  it("'Duration' tab matches snapshot", () => {
    jest.setSystemTime(new Date(2060, 1, 1, 0, 0, 0));
    const { asFragment } = renderDateTimeSelect();
    expect(asFragment()).toMatchSnapshot();
  });

  it("'Duration' tab unmounts without crashing", () => {
    const { unmount } = renderDateTimeSelect();
    unmount();
  });

  it("clicking on the 'Starts' tab switches content to 'startsAt' selection", () => {
    const { container } = renderDateTimeSelect();
    const tabs = container.querySelectorAll(".nav-link");
    expect(tabs[0].textContent).toMatch(/Starts/);
    fireEvent.click(tabs[0]);
    expect(container.querySelector(".tab-content")?.textContent).toMatch(
      /2060/,
    );
  });

  it("'Starts' tab matches snapshot", () => {
    jest.setSystemTime(new Date(2060, 1, 1, 0, 0, 0));
    const { container, asFragment } = renderDateTimeSelect();
    fireEvent.click(container.querySelectorAll(".nav-link")[0]);
    expect(asFragment()).toMatchSnapshot();
  });

  it("'Starts' tab unmounts without crashing", () => {
    const { container, unmount } = renderDateTimeSelect();
    fireEvent.click(container.querySelectorAll(".nav-link")[0]);
    unmount();
  });

  it("clicking on the 'Ends' tab switches content to 'endsAt' selection", () => {
    const { container } = renderDateTimeSelect();
    const tabs = container.querySelectorAll(".nav-link");
    expect(tabs[1].textContent).toMatch(/Ends/);
    fireEvent.click(tabs[1]);
    expect(container.querySelector(".tab-content")?.textContent).toMatch(
      /2061/,
    );
  });

  it("'Ends' tab matches snapshot", () => {
    jest.setSystemTime(new Date(2060, 1, 1, 0, 0, 0));
    const { container, asFragment } = renderDateTimeSelect();
    fireEvent.click(container.querySelectorAll(".nav-link")[1]);
    expect(asFragment()).toMatchSnapshot();
  });

  it("'Ends' tab unmounts without crashing", () => {
    const { container, unmount } = renderDateTimeSelect();
    fireEvent.click(container.querySelectorAll(".nav-link")[1]);
    unmount();
  });

  it("clicking on the 'Duration' tabs switches content to duration selection", () => {
    const { container } = renderDateTimeSelect();
    const tabs = container.querySelectorAll(".nav-link");
    fireEvent.click(tabs[0]);
    expect(tabs[2].textContent).toMatch(/Duration/);
    fireEvent.click(tabs[2]);
    expect(container.querySelector(".tab-content")?.textContent).toBe(
      "366days0hours0minutes",
    );
  });

  it("'Ends' tab offset badge is updated after 1 minute", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2060, 1, 1, 12, 0, 0));
    silenceFormStore.data.setStart(new Date(2060, 1, 1, 12, 0, 0));
    silenceFormStore.data.setEnd(new Date(2060, 1, 1, 13, 0, 0));

    const { container } = renderDateTimeSelect();
    expect(container.querySelectorAll(".nav-link")[1].textContent).toBe(
      "Endsin 1h ",
    );

    jest.setSystemTime(new Date(2060, 1, 1, 12, 1, 0));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(container.querySelectorAll(".nav-link")[1].textContent).toBe(
      "Endsin 59m ",
    );
  });

  it("unmounts cleanly", () => {
    const { unmount } = renderDateTimeSelect();
    unmount();
  });
});

const ValidateTimeButton = (
  container: HTMLElement,
  storeKey: "startsAt" | "endsAt",
  elemIndex: number,
  iconMatch: RegExp,
  expectedDiff: number,
) => {
  const buttons = container.querySelectorAll("td > span");
  const button = buttons[elemIndex];
  expect(button.innerHTML).toMatch(iconMatch);

  const oldTimeValue = new Date(silenceFormStore.data[storeKey]);
  fireEvent.click(button);
  expect(silenceFormStore.data[storeKey].toISOString()).not.toBe(
    oldTimeValue.toISOString(),
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data[storeKey],
    oldTimeValue,
  );
  expect(diffMS).toBe(expectedDiff);
};

const ValidateTimeWheel = (
  container: HTMLElement,
  storeKey: "startsAt" | "endsAt",
  className: string,
  deltaY: number,
  expectedDiff: number,
) => {
  const elem = container.querySelector(className);

  const oldTimeValue = new Date(silenceFormStore.data[storeKey]);

  fireEvent.wheel(elem!, { deltaY: deltaY });
  // fire real event so cancel listener will trigger
  const event = new WheelEvent("wheel", { deltaY: deltaY });
  const hourMinute = container.querySelector("div.components-hour-minute");
  hourMinute?.dispatchEvent(event);

  expect(silenceFormStore.data[storeKey].toISOString()).not.toBe(
    oldTimeValue.toISOString(),
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data[storeKey],
    oldTimeValue,
  );
  expect(diffMS).toBe(expectedDiff);
};

const renderTabContentStart = () => {
  return render(<TabContentStart silenceFormStore={silenceFormStore} />);
};

describe("<TabContentStart />", () => {
  it("selecting date on DayPicker updates startsAt", () => {
    // Verifies clicking a day in the calendar updates the startsAt date
    const { container } = renderTabContentStart();
    expect(silenceFormStore.data.startsAt.toISOString()).toBe(
      new Date(2060, 1, 1, 0, 0, 0).toISOString(),
    );
    // In v9, day buttons use .rdp-day_button class
    const dayButtons = container.querySelectorAll("button.rdp-day_button");
    fireEvent.click(dayButtons[17]);
    expect(silenceFormStore.data.startsAt.toISOString()).toBe(
      new Date(2060, 1, 18, 0, 0, 0).toISOString(),
    );
  });

  it("clicking on the hour inc button adds 1h to startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeButton(container, "startsAt", 0, /angle-up/, 3600 * 1000);
  });

  it("Today button takes you back to the current month", () => {
    const { container } = renderTabContentStart();
    expect(silenceFormStore.data.startsAt.toISOString()).toBe(
      new Date(2060, 1, 1, 0, 0, 0).toISOString(),
    );
    expect(container.querySelector(".rdp-month_caption")?.textContent).toBe(
      "February 2060",
    );
    fireEvent.click(container.querySelector("button.rdp-button_next")!);
    expect(container.querySelector(".rdp-month_caption")?.textContent).toBe(
      "March 2060",
    );
    fireEvent.click(container.querySelector("button.btn.btn-light.btn-sm")!);
    expect(container.querySelector(".rdp-month_caption")?.textContent).toBe(
      format(new Date(), "LLLL yyyy"),
    );
  });

  it("scrolling up on the hour button adds 1h to startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-hour-up",
      -1,
      3600 * 1000,
    );
  });

  it("clicking on the minute inc button adds 1m to startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeButton(container, "startsAt", 1, /angle-up/, 60 * 1000);
  });

  it("scrolling up on the minute button adds 1m to startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-minute-up",
      -2,
      60 * 1000,
    );
  });

  it("clicking on the hour dec button subtracts 1h from startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeButton(
      container,
      "startsAt",
      2,
      /angle-down/,
      -1 * 3600 * 1000,
    );
  });

  it("scrolling down on the hour button subtracts 1h from startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-hour-down",
      1,
      -1 * 3600 * 1000,
    );
  });

  it("scrolling up on the minute adds 1m to startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-minute",
      -2,
      60 * 1000,
    );
  });

  it("scrolling down on the minute subtracts 1m from startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-minute",
      1,
      -1 * 60 * 1000,
    );
  });

  it("clicking on the minute dec button subtracts 1m from startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeButton(container, "startsAt", 3, /angle-down/, -1 * 60 * 1000);
  });

  it("scrolling down by deltaY=2 on the minute button subtracts 1m from startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-minute-down",
      2,
      -1 * 60 * 1000,
    );
  });

  it("scrolling up on the minute subtracts 1m from startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-minute",
      -50,
      60 * 1000,
    );
  });

  it("scrolling down by deltaY=1 on the minute subtracts 1m from startsAt", () => {
    const { container } = renderTabContentStart();
    ValidateTimeWheel(
      container,
      "startsAt",
      "td.components-minute",
      1,
      -1 * 60 * 1000,
    );
  });
});

const renderTabContentEnd = () => {
  return render(<TabContentEnd silenceFormStore={silenceFormStore} />);
};

describe("<TabContentEnd />", () => {
  it("Selecting date on DayPicker updates endsAt", () => {
    // Verifies clicking a day in the calendar updates the endsAt date
    const { container } = renderTabContentEnd();
    expect(silenceFormStore.data.endsAt.toISOString()).toBe(
      new Date(2061, 1, 1, 0, 0, 0).toISOString(),
    );
    // In v9, day buttons use .rdp-day_button class
    const dayButtons = container.querySelectorAll("button.rdp-day_button");
    fireEvent.click(dayButtons[23]);
    expect(silenceFormStore.data.endsAt.toISOString()).toBe(
      new Date(2061, 1, 24, 0, 0, 0).toISOString(),
    );
  });

  it("clicking on the hour inc button adds 1h to endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeButton(container, "endsAt", 0, /angle-up/, 3600 * 1000);
  });

  it("Today button takes you back to the current month", () => {
    const { container } = renderTabContentEnd();
    expect(silenceFormStore.data.endsAt.toISOString()).toBe(
      new Date(2061, 1, 1, 0, 0, 0).toISOString(),
    );
    expect(container.querySelector(".rdp-month_caption")?.textContent).toBe(
      "February 2061",
    );
    fireEvent.click(container.querySelector("button.rdp-button_next")!);
    expect(container.querySelector(".rdp-month_caption")?.textContent).toBe(
      "March 2061",
    );
    fireEvent.click(container.querySelector("button.btn.btn-light.btn-sm")!);
    expect(container.querySelector(".rdp-month_caption")?.textContent).toBe(
      format(new Date(), "LLLL yyyy"),
    );
  });

  it("scrolling up on the hour button adds 1h to endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-hour-up",
      -1,
      3600 * 1000,
    );
  });

  it("scrolling up on the hour adds 1h to endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-hour",
      -1,
      3600 * 1000,
    );
  });

  it("scrolling down on the hour subtracts 1h from endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-hour",
      1,
      -1 * 3600 * 1000,
    );
  });

  it("clicking on the minute inc button adds 1m to endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeButton(container, "endsAt", 1, /angle-up/, 60 * 1000);
  });

  it("scrolling up on the minute button adds 1m to endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-minute-up",
      -10,
      60 * 1000,
    );
  });

  it("clicking on the hour dec button subtracts 1h from endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeButton(container, "endsAt", 2, /angle-down/, -1 * 3600 * 1000);
  });

  it("scrolling down on the hour button subtracts 1h from endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-hour-down",
      1,
      -1 * 3600 * 1000,
    );
  });

  it("clicking on the minute dec button subtracts 1m from endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeButton(container, "endsAt", 3, /angle-down/, -1 * 60 * 1000);
  });

  it("scrolling down on the minute button subtracts 1m from endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-minute-down",
      50,
      -1 * 60 * 1000,
    );
  });

  it("scrolling up on the minute adds 1m to endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-minute",
      -10,
      60 * 1000,
    );
  });

  it("scrolling down on the minute subtracts 1m from endsAt", () => {
    const { container } = renderTabContentEnd();
    ValidateTimeWheel(
      container,
      "endsAt",
      "td.components-minute",
      15,
      -1 * 60 * 1000,
    );
  });
});

const ValidateDurationButton = (
  elemIndex: number,
  iconMatch: RegExp,
  expectedDiff: number,
) => {
  const { container } = render(
    <TabContentDuration silenceFormStore={silenceFormStore} />,
  );
  const buttons = container.querySelectorAll("td > span");
  const button = buttons[elemIndex];
  expect(button.innerHTML).toMatch(iconMatch);

  const oldEndsAt = new Date(silenceFormStore.data.endsAt);
  fireEvent.click(button);
  expect(silenceFormStore.data.endsAt.toISOString()).not.toBe(
    oldEndsAt.toISOString(),
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data.endsAt,
    oldEndsAt,
  );
  expect(diffMS).toBe(expectedDiff);
};

const ValidateDurationWheel = (
  elemIndex: number,
  deltaY: number,
  expectedDiff: number,
) => {
  const { container } = render(
    <TabContentDuration silenceFormStore={silenceFormStore} />,
  );
  const elems = container.querySelectorAll(".components-duration");
  const elem = elems[elemIndex];

  const oldEndsAt = new Date(silenceFormStore.data.endsAt);

  fireEvent.wheel(elem, { deltaY: deltaY });
  // fire real event so cancel listener will trigger
  const event = new WheelEvent("wheel", { deltaY: deltaY });
  elem.dispatchEvent(event);

  expect(silenceFormStore.data.endsAt.toISOString()).not.toBe(
    oldEndsAt.toISOString(),
  );
  const diffMS = differenceInMilliseconds(
    silenceFormStore.data.endsAt,
    oldEndsAt,
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

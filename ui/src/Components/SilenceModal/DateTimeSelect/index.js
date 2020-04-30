import React, { useEffect } from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import moment from "moment";

import DatePicker from "react-datepicker";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Duration } from "./Duration";
import { HourMinute } from "./HourMinute";

const OffsetBadge = ({ startDate, endDate, prefixLabel }) => {
  const days = endDate.diff(startDate, "days");
  const hours = endDate.diff(startDate, "hours") % 24;
  const minutes = endDate.diff(startDate, "minutes") % 60;

  return (
    <span className="badge badge-light">
      {days <= 0 && hours <= 0 && minutes <= 0 ? "now" : prefixLabel}
      {days > 0 ? `${days}d ` : null}
      {hours > 0 ? `${hours}h ` : null}
      {minutes > 0 ? `${minutes}m ` : null}
    </span>
  );
};
OffsetBadge.propTypes = {
  startDate: PropTypes.instanceOf(moment).isRequired,
  endDate: PropTypes.instanceOf(moment).isRequired,
  prefixLabel: PropTypes.string.isRequired,
};

const Tab = ({ title, active, onClick }) => (
  <li className="nav-item">
    <span
      className={`nav-link cursor-pointer ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {title}
    </span>
  </li>
);
Tab.propTypes = {
  title: PropTypes.node.isRequired,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

const TabNames = Object.freeze({
  Start: "start",
  End: "end",
  Duration: "duration",
});

const TabContentStart = ({ silenceFormStore }) => {
  return useObserver(() => (
    <div className="d-flex flex-sm-row flex-column justify-content-around mx-3 mt-2">
      <div className="d-flex justify-content-center align-items-center">
        <DatePicker
          inline
          todayButton={"Today"}
          minDate={moment().second(0).toDate()}
          selected={silenceFormStore.data.startsAt.toDate()}
          onChange={(val) => {
            silenceFormStore.data.startsAt = moment(val);
            silenceFormStore.data.verifyStarEnd();
          }}
        />
      </div>
      <HourMinute
        dateValue={silenceFormStore.data.startsAt}
        onHourInc={() => silenceFormStore.data.incStart(60)}
        onHourDec={() => silenceFormStore.data.decStart(60)}
        onMinuteInc={() => silenceFormStore.data.incStart(1)}
        onMinuteDec={() => silenceFormStore.data.decStart(1)}
      />
    </div>
  ));
};

const TabContentEnd = ({ silenceFormStore }) => {
  return useObserver(() => (
    <div className="d-flex flex-sm-row flex-column justify-content-around mx-3 mt-2">
      <div className="d-flex justify-content-center align-items-center">
        <DatePicker
          inline
          todayButton={"Today"}
          minDate={moment().second(0).add(1, "minutes").toDate()}
          selected={silenceFormStore.data.endsAt.toDate()}
          onChange={(val) => {
            silenceFormStore.data.endsAt = moment(val);
            silenceFormStore.data.verifyStarEnd();
          }}
        />
      </div>
      <HourMinute
        dateValue={silenceFormStore.data.endsAt}
        onHourInc={() => silenceFormStore.data.incEnd(60)}
        onHourDec={() => silenceFormStore.data.decEnd(60)}
        onMinuteInc={() => silenceFormStore.data.incEnd(1)}
        onMinuteDec={() => silenceFormStore.data.decEnd(1)}
      />
    </div>
  ));
};

// calculate value for duration increase button using a goal step
const CalculateChangeValueUp = (currentValue, step) => {
  // if current value is less than step (but >0) then use 1
  if (currentValue > 0 && currentValue < step) {
    return 1;
  }
  // otherwise use step or a value that moves current value to the next step
  return step - (currentValue % step);
};

// calculate value for duration decrease button using a goal step
const CalculateChangeValueDown = (currentValue, step) => {
  // if current value is less than step (but >0) then use 1
  if (currentValue > 0 && currentValue < step) {
    return 1;
  }
  // otherwise use step or a value that moves current value to the next step
  return currentValue % step || step;
};

const TabContentDuration = ({ silenceFormStore }) => {
  return useObserver(() => (
    <div className="d-flex flex-sm-row flex-column justify-content-around mt-2 mx-3">
      <Duration
        label="days"
        value={silenceFormStore.data.toDuration.days}
        onInc={() => silenceFormStore.data.incEnd(60 * 24)}
        onDec={() => silenceFormStore.data.decEnd(60 * 24)}
      />
      <Duration
        label="hours"
        value={silenceFormStore.data.toDuration.hours}
        onInc={() => silenceFormStore.data.incEnd(60)}
        onDec={() => silenceFormStore.data.decEnd(60)}
      />
      <Duration
        label="minutes"
        value={silenceFormStore.data.toDuration.minutes}
        onInc={() =>
          silenceFormStore.data.incEnd(
            CalculateChangeValueUp(silenceFormStore.data.toDuration.minutes, 5)
          )
        }
        onDec={() =>
          silenceFormStore.data.decEnd(
            CalculateChangeValueDown(
              silenceFormStore.data.toDuration.minutes,
              5
            )
          )
        }
      />
    </div>
  ));
};
TabContentDuration.propTypes = {
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

const DateTimeSelect = ({ silenceFormStore, openTab }) => {
  const tab = useLocalStore(() => ({
    current: openTab,
    setStart() {
      this.current = TabNames.Start;
    },
    setEnd() {
      this.current = TabNames.End;
    },
    setDuration() {
      this.current = TabNames.Duration;
    },
    timeNow: moment().seconds(0),
    updateTimeNow() {
      this.timeNow = moment().seconds(0);
    },
  }));

  useEffect(() => {
    tab.updateTimeNow();
    const nowUpdateTimer = setInterval(tab.updateTimeNow, 30 * 1000);
    return () => {
      clearInterval(nowUpdateTimer);
    };
  }, [tab]);

  return useObserver(() => (
    <React.Fragment>
      <ul className="nav nav-tabs nav-fill">
        <Tab
          title={
            <React.Fragment>
              <span className="mr-1">Starts</span>
              <OffsetBadge
                prefixLabel="in "
                startDate={tab.timeNow}
                endDate={silenceFormStore.data.startsAt}
              />
            </React.Fragment>
          }
          active={tab.current === TabNames.Start}
          onClick={tab.setStart}
        />
        <Tab
          title={
            <React.Fragment>
              <span className="mr-1">Ends</span>
              <OffsetBadge
                prefixLabel="in "
                startDate={tab.timeNow}
                endDate={silenceFormStore.data.endsAt}
              />
            </React.Fragment>
          }
          active={tab.current === TabNames.End}
          onClick={tab.setEnd}
        />
        <Tab
          title={
            <React.Fragment>
              <span className="mr-1">Duration</span>
              <OffsetBadge
                prefixLabel=""
                startDate={silenceFormStore.data.startsAt}
                endDate={silenceFormStore.data.endsAt}
              />
            </React.Fragment>
          }
          active={tab.current === TabNames.Duration}
          onClick={tab.setDuration}
        />
      </ul>
      <div className="tab-content mb-3">
        {tab.current === TabNames.Duration ? (
          <TabContentDuration silenceFormStore={silenceFormStore} />
        ) : null}
        {tab.current === TabNames.Start ? (
          <TabContentStart silenceFormStore={silenceFormStore} />
        ) : null}
        {tab.current === TabNames.End ? (
          <TabContentEnd silenceFormStore={silenceFormStore} />
        ) : null}
      </div>
    </React.Fragment>
  ));
};
DateTimeSelect.propTypes = {
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  openTab: PropTypes.oneOf(Object.values(TabNames)),
};
DateTimeSelect.defaultProps = {
  openTab: TabNames.Duration,
};

export {
  DateTimeSelect,
  TabContentStart,
  TabContentEnd,
  TabContentDuration,
  TabNames,
};

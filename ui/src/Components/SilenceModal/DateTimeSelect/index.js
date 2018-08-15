import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import moment from "moment";

import DatePicker from "react-datepicker";

import { Duration } from "./Duration";
import { HourMinute } from "./HourMinute";

import "./index.css";

const Tab = ({ title, active, onClick }) => (
  <li className="nav-item">
    <a
      className={`nav-link cursor-pointer ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {title}
    </a>
  </li>
);
Tab.propTypes = {
  title: PropTypes.node.isRequired,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired
};

const TabNames = Object.freeze({
  Start: "start",
  End: "end",
  Duration: "duration"
});

const TabContentStart = observer(({ silenceFormStore }) => {
  return (
    <div className="d-flex flex-sm-row flex-column justify-content-around mx-3 mt-2 ">
      <DatePicker
        inline
        todayButton={"Now"}
        minDate={moment()}
        selected={silenceFormStore.data.startsAt}
        onChange={val => {
          silenceFormStore.data.startsAt = moment(val);
          silenceFormStore.data.verifyStarEnd();
        }}
      />
      <HourMinute
        dateValue={silenceFormStore.data.startsAt}
        onHourInc={() => silenceFormStore.data.incStart(60)}
        onHourDec={() => silenceFormStore.data.decStart(60)}
        onMinuteInc={() => silenceFormStore.data.incStart(1)}
        onMinuteDec={() => silenceFormStore.data.decStart(1)}
      />
    </div>
  );
});

const TabContentEnd = observer(({ silenceFormStore }) => {
  return (
    <div className="d-flex flex-sm-row flex-column justify-content-around mx-3 mt-2 ">
      <DatePicker
        inline
        todayButton={"Now"}
        minDate={moment()}
        selected={silenceFormStore.data.endsAt}
        onChange={val => {
          silenceFormStore.data.endsAt = moment(val);
          silenceFormStore.data.verifyStarEnd();
        }}
      />
      <HourMinute
        dateValue={silenceFormStore.data.endsAt}
        onHourInc={() => silenceFormStore.data.incEnd(60)}
        onHourDec={() => silenceFormStore.data.decEnd(60)}
        onMinuteInc={() => silenceFormStore.data.incEnd(1)}
        onMinuteDec={() => silenceFormStore.data.decEnd(1)}
      />
    </div>
  );
});

// calculate value for duration increase and decrease buttons using a goal step
const CalculateChangeValue = (currentValue, step) => {
  // if current value is less than step (but >0) then use 1
  if (currentValue > 0 && currentValue < step) {
    return 1;
  }
  // otherwise use step or a value that moves current value to the next step
  return step - (currentValue % step) || step;
};

const TabContentDuration = observer(({ silenceFormStore }) => {
  return (
    <div className="d-flex flex-sm-row flex-column justify-content-around mt-2 mx-3">
      <Duration
        label="days"
        value={silenceFormStore.data.toDuration.days}
        onInc={() => silenceFormStore.data.incDuration(60 * 24)}
        onDec={() => silenceFormStore.data.decDuration(60 * 24)}
      />
      <Duration
        label="hours"
        value={silenceFormStore.data.toDuration.hours}
        onInc={() => silenceFormStore.data.incDuration(60)}
        onDec={() => silenceFormStore.data.decDuration(60)}
      />
      <Duration
        label="minutes"
        value={silenceFormStore.data.toDuration.minutes}
        onInc={() =>
          silenceFormStore.data.incDuration(
            CalculateChangeValue(silenceFormStore.data.toDuration.minutes, 5)
          )
        }
        onDec={() =>
          silenceFormStore.data.decDuration(
            CalculateChangeValue(silenceFormStore.data.toDuration.minutes, 5)
          )
        }
      />
    </div>
  );
});
TabContentDuration.propTypes = {
  silenceFormStore: PropTypes.object.isRequired
};

const DateTimeSelect = observer(
  class DateTimeSelect extends Component {
    static propTypes = {
      silenceFormStore: PropTypes.object.isRequired
    };

    tab = observable(
      {
        current: TabNames.Duration,
        setStart() {
          this.current = TabNames.Start;
        },
        setEnd() {
          this.current = TabNames.End;
        },
        setDuration() {
          this.current = TabNames.Duration;
        }
      },
      {
        setStart: action.bound,
        setEnd: action.bound,
        setDuration: action.bound
      }
    );

    render() {
      const { silenceFormStore } = this.props;

      return (
        <React.Fragment>
          <ul className="nav nav-tabs nav-fill">
            <Tab
              title="Start"
              active={this.tab.current === TabNames.Start}
              onClick={this.tab.setStart}
            />
            <Tab
              title="End"
              active={this.tab.current === TabNames.End}
              onClick={this.tab.setEnd}
            />
            <Tab
              title="Duration"
              active={this.tab.current === TabNames.Duration}
              onClick={this.tab.setDuration}
            />
          </ul>
          <div className="tab-content mb-3">
            {this.tab.current === TabNames.Duration ? (
              <TabContentDuration silenceFormStore={silenceFormStore} />
            ) : null}
            {this.tab.current === TabNames.Start ? (
              <TabContentStart silenceFormStore={silenceFormStore} />
            ) : null}
            {this.tab.current === TabNames.End ? (
              <TabContentEnd silenceFormStore={silenceFormStore} />
            ) : null}
          </div>
        </React.Fragment>
      );
    }
  }
);

export { DateTimeSelect };

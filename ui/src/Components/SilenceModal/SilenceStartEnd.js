import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action, toJS } from "mobx";
import { observer } from "mobx-react";

import moment from "moment";

import Picker from "rc-calendar/lib/Picker";
import RangeCalendar from "rc-calendar/lib/RangeCalendar";
import "rc-calendar/assets/index.css";

import TimePickerPanel from "rc-time-picker/lib/Panel";
import "rc-time-picker/assets/index.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt } from "@fortawesome/free-solid-svg-icons/faCalendarAlt";

import "./SilenceStartEnd.css";

function disabledDate(current) {
  if (!current) return false;

  const date = moment();
  date.hour(0);
  date.minute(0);
  date.second(0);
  return current.isBefore(date);
}

function isValidRange(v) {
  return v && v[0] && v[1];
}

const format = "YYYY-MM-DD HH:mm";
function formatTimestamp(v) {
  return v ? v.format(format) : "";
}

const timePickerElement = (
  <TimePickerPanel
    defaultValue={[
      moment().second(0),
      moment()
        .second(0)
        .add(1, "minute")
    ]}
    showSecond={false}
  />
);

const SilenceStartEnd = observer(
  class SilenceStartEnd extends Component {
    static propTypes = {
      silenceFormStore: PropTypes.object.isRequired
    };

    data = observable({
      hoverValue: []
    });

    onChange = action(value => {
      const { silenceFormStore } = this.props;

      if (value && value[0]) {
        silenceFormStore.data.startsAt = value[0];
      }
      if (value && value[1]) {
        silenceFormStore.data.endsAt = value[1];
      }
    });

    onHoverChange = action(value => {
      this.data.hoverValue = value;
    });

    render() {
      const { silenceFormStore } = this.props;

      const now = moment().second(0);

      const calendar = (
        <RangeCalendar
          hoverValue={toJS(this.data.hoverValue)}
          onHoverChange={this.onHoverChange}
          showWeekNumber={false}
          dateInputPlaceholder={["start", "end"]}
          defaultValue={[now, now.clone().add(1, "hour")]}
          timePicker={timePickerElement}
          disabledDate={disabledDate}
          format={format}
        />
      );
      return (
        <Picker
          value={[silenceFormStore.data.startsAt, silenceFormStore.data.endsAt]}
          onChange={this.onChange}
          calendar={calendar}
        >
          {({ value }) => {
            return (
              <div className="input-group mb-3">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </span>
                </div>
                <input
                  placeholder="Silence start and end"
                  className="form-control bg-white"
                  value={
                    (isValidRange(value) &&
                      `${formatTimestamp(value[0])} - ${formatTimestamp(
                        value[1]
                      )}`) ||
                    ""
                  }
                  readOnly
                />
              </div>
            );
          }}
        </Picker>
      );
    }
  }
);

export { SilenceStartEnd };

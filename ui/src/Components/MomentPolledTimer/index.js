import React, { useEffect } from "react";

import Moment from "react-moment";

export function MomentPolledTimer() {
  useEffect(() => {
    Moment.startPooledTimer();
    return () => Moment.clearPooledTimer();
  }, []);

  return <span id="moment-polled-timer" />;
}

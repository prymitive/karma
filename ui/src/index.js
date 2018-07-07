import React from "react";
import ReactDOM from "react-dom";

import Moment from "react-moment";

import { App } from "./App";

// enable console warnings, but only for dev
if (process.env.NODE_ENV === "development") {
  const { whyDidYouUpdate } = require("why-did-you-update");
  whyDidYouUpdate(React, {
    exclude: [/^Linkify$/, /^CSSTransition$/, /^inject-/, /^InnerReference$/]
  });
}

// global timer for updating timestamps to human readable offsets
// this needs to be run before any <Moment/> instance
// https://www.npmjs.com/package/react-moment#pooled-timer
Moment.startPooledTimer();

ReactDOM.render(<App />, document.getElementById("root"));

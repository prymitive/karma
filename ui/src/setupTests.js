import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

import { FetchRetryConfig } from "Common/Fetch";

// https://github.com/airbnb/enzyme
Enzyme.configure({ adapter: new Adapter() });

// favico.js needs canvas
import("jest-canvas-mock");

// used to mock current time since we render moment.fromNow() in some places
import("jest-date-mock");

// fetch is used in multiple places to interact with Go backend
// or upstream Alertmanager API
global.fetch = require("jest-fetch-mock");

// ensure that all console messages throw errors
for (const level of ["error", "warn", "info", "log", "trace"]) {
  // https://reactjs.org/blog/2019/08/08/react-v16.9.0.html#new-deprecations
  const reactDeprecationWarning = /.*has been renamed, and is not recommended for use.*/;
  global.console[level] = (message, ...args) => {
    if (
      reactDeprecationWarning.test(message) === false &&
      message !== "react-reveal - animation failed"
    ) {
      throw new Error(`message=${message} args=${args}`);
    }
  };
}

FetchRetryConfig.minTimeout = 2;
FetchRetryConfig.maxTimeout = 10;

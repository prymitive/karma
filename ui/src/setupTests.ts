import React from "react";
import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

import { FetchRetryConfig } from "Common/Fetch";

import "mobx-react-lite/batchingForReactDom";

// https://github.com/airbnb/enzyme
Enzyme.configure({ adapter: new Adapter() });

// favico.js needs canvas
require("jest-canvas-mock");

// used to mock current time since we render moment.fromNow() in some places
require("jest-date-mock");

// https://reactjs.org/blog/2019/08/08/react-v16.9.0.html#new-deprecations
const reactDeprecationWarning = /.*has been renamed, and is not recommended for use.*/;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const consoleHandler = (message?: any, ...args: any): void => {
  if (reactDeprecationWarning.test(message as string) === false) {
    throw new Error(`message=${message} args=${args}`);
  }
};
global.console.error = consoleHandler;
global.console.warn = consoleHandler;
global.console.info = consoleHandler;
global.console.log = consoleHandler;
global.console.trace = consoleHandler;

FetchRetryConfig.minTimeout = 2;
FetchRetryConfig.maxTimeout = 10;

// usePopper uses useLayoutEffect but that fails in enzyme
React.useLayoutEffect = React.useEffect;

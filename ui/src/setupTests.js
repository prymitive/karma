import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

import mockConsole from "jest-mock-console";

// https://github.com/airbnb/enzyme
Enzyme.configure({ adapter: new Adapter() });

// mock console
mockConsole(["error", "warn", "info", "log", "trace"]);

// localStorage is used for Settings store
require("jest-localstorage-mock");

// favico.js needs canvas
require("jest-canvas-mock");

// fetch is used in multiple places to interact with Go backend
// or upstream Alertmanager API
global.fetch = require("jest-fetch-mock");

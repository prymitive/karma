import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

// https://github.com/airbnb/enzyme
Enzyme.configure({ adapter: new Adapter() });

// localStorage is used for Settings store
require("jest-localstorage-mock");

// favico.js needs canvas
require("jest-canvas-mock");

// used to mock current time since we render moment.fromNow() in some places
require("jest-date-mock");

// fetch is used in multiple places to interact with Go backend
// or upstream Alertmanager API
global.fetch = require("jest-fetch-mock");

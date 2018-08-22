import mockConsole from "jest-mock-console";

// mock console
mockConsole(["error", "warn", "info", "log", "trace"]);

// localStorage is used for Settings store
require("jest-localstorage-mock");

// fetch is used in multiple places to interact with Go backend
// or upstream Alertmanager API
global.fetch = require("jest-fetch-mock");

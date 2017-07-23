const moment = require("moment");

test("watchdog init()", () => {
    window.jQuery = require("jquery");
    const watchdog = require("./watchdog");
    watchdog.init(1, 1);
});

test("watchdog getLastUpdate() without pong", () => {
    window.jQuery = require("jquery");
    const watchdog = require("./watchdog");
    expect(watchdog.getLastUpdate()).toBe(0);
});

test("watchdog getLastUpdate() with pong", () => {
    window.jQuery = require("jquery");
    const watchdog = require("./watchdog");
    var ts = moment();
    watchdog.pong(ts);
    expect(watchdog.getLastUpdate()).toBe(ts.utc().unix());
});

test("watchdog isFatal() should be false by default", () => {
    window.jQuery = require("jquery");
    const watchdog = require("./watchdog");
    expect(watchdog.isFatal()).toBe(false);
});

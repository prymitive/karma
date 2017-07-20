const watchdog = require("./watchdog");
const moment = require("moment");

test("watchdog init()", () => {
    watchdog.init();
});

test("watchdog getLastUpdate() without pong", () => {
    expect(watchdog.getLastUpdate()).toBe(0);
});

test("watchdog getLastUpdate() with pong", () => {
    var ts = moment();
    watchdog.pong(ts);
    expect(watchdog.getLastUpdate()).toBe(ts.utc().unix());
});

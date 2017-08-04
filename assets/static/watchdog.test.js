window.jQuery = require("jquery");
const moment = require("moment");

jest.useFakeTimers();

test("watchdog init()", () => {
    const watchdog = require("./watchdog");
    watchdog.init(1, 1);
});

test("watchdog getLastUpdate() without pong", () => {
    const watchdog = require("./watchdog");
    expect(watchdog.getLastUpdate()).toBe(0);
});

test("watchdog getLastUpdate() with pong", () => {
    const watchdog = require("./watchdog");
    var ts = moment();
    watchdog.pong(ts);
    expect(watchdog.getLastUpdate()).toBe(ts.utc().unix());
});

test("watchdog isFatal() should be false by default", () => {
    const watchdog = require("./watchdog");
    expect(watchdog.isFatal()).toBe(false);
});

test("watchdog isFatal() should be true after deadline passes", () => {
    const counter = require("./counter");
    counter.init();

    const config = require("./config");
    config.newOption({
        Cookie: "autoRefresh",
        QueryParam: "autorefresh",
        Selector: "#autorefresh",
        Getter: function() {
            return true;
        }
    });

    const templatesMock = require("./__mocks__/templatesMock");
    document.body.innerHTML = templatesMock.loadTemplates();
    const templates = require("./templates");
    templates.init();

    const watchdog = require("./watchdog");
    jest.clearAllTimers();
    watchdog.init(1, 60); // 1s interval, 60s tolerance
    // should be false before we pong() the first time
    expect(watchdog.isFatal()).toBe(false);

    watchdog.pong(moment());
    // should be false after first pong since we're < maxLag
    expect(watchdog.isFatal()).toBe(false);

    // last timestamp is too old, should be true
    var ts = moment().subtract(61, "seconds");
    watchdog.pong(ts);
    expect(watchdog.getLastUpdate()).toBe(ts.utc().unix());
    jest.runTimersToTime(2 * 1000);
    expect(watchdog.isFatal()).toBe(true);
});

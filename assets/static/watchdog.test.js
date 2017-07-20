const watchdog = require("./watchdog");

test("watchdog init", () => {
    watchdog.init();
});

test("watchdog getTs without pong", () => {
    expect(watchdog.getTs).toBe(undefined);
});

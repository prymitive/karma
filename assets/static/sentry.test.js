test("sentry loaded", () => {
    document.body.setAttribute("data-raven-dsn", "123");
    document.body.setAttribute("data-unsee-version", "0.1.2");
    require("./sentry");
    const Raven = require("raven-js");
    expect(Raven.lastEventId()).toBeNull();
});

"use strict";

const Raven = require("raven-js");
const $ = require("jquery");

// init sentry client if sentry dsn is set
if ($("body").data("raven-dsn")) {
    var dsn = $("body").data("raven-dsn");
    // raven itself can fail if invalid DSN is passed
    try {
        Raven.config(dsn, {
            release: $("body").data("unsee-version")
        }).install();
    } catch (error) {
        var msg = "Sentry error: " + error.message;
        $("#raven-error").text(msg).removeClass("hidden");
    }
}

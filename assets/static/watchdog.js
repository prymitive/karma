"use strict";

const $ = require("jquery");
const moment = require("moment");

const config = require("./config");
const counter = require("./counter");
const templates = require("./templates");

var selectors = {
    countdown: "#reload-counter"
};

var lastTs = 0;
var maxLag;

var inCountdown = false;
var fatalCountdown = 60;
var fatalReloadTimer = false;
var fatalCounterTimer = false;

function timerTick() {
    if (lastTs === 0) return;

    // don't raise an error if autorefresh is disabled
    if (!config.getOption("autorefresh").Get()) return;

    var now = moment().utc().unix();
    if (now - lastTs > maxLag) {
        $("#errors").html(templates.renderTemplate("fatalError", {
            lastTs: lastTs,
            secondsLeft: fatalCountdown
        })).show();
        counter.markUnknown();
        if (!inCountdown) {
            fatalCountdown = 60;
            fatalReloadTimer = setTimeout(function() {
                location.reload();
            }, 60 * 1000);
            fatalCounterTimer = setInterval(function() {
                $(selectors.countdown).text(--fatalCountdown);
            }, 1000);
            inCountdown = true;
        }
    } else {
        inCountdown = false;
        if (fatalReloadTimer) clearTimeout(fatalReloadTimer);
        if (fatalCounterTimer) clearTimeout(fatalCounterTimer);
    }
}

function init(interval, tolerance) {
    maxLag = tolerance;
    setInterval(timerTick, interval * 1000);
}

function pong(ts) {
    lastTs = ts.utc().unix();
}

function getLastUpdate() {
    return lastTs;
}

function isFatal() {
    return inCountdown;
}

exports.init = init;
exports.pong = pong;
exports.getLastUpdate = getLastUpdate;
exports.isFatal = isFatal;

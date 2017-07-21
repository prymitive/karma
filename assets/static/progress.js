const NProgress = require("nprogress");

var timer;

function init() {
    NProgress.configure({
        minimum: 0.01,
        showSpinner: false,
        easing: "linear"
    });
}

function resetTimer() {
    if (timer !== false) {
        clearInterval(timer);
        timer = false;
    }
}

function complete() {
    resetTimer();
    NProgress.done();
}

function pause() {
    resetTimer();
    NProgress.set(0.0);
}

function start() {
    var stepMs = 250; // animation step in ms
    var steps = (Unsee.GetRefreshRate() * 1000) / stepMs; // how many steps we have
    NProgress.set(0.0);
    resetTimer();
    timer = setInterval(function() {
        NProgress.inc(1.0 / steps);
    }, stepMs);
}

exports.init = init;
exports.pause = pause;
exports.complete = complete;
exports.start = start;
exports.resetTimer = resetTimer;

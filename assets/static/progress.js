var Progress = (function() {


    var timer;


    init = function() {
        NProgress.configure({
            minimum: 0.01,
            showSpinner: false,
            easing: 'linear'
        });
    };


    resetTimer = function() {
        if (timer !== false) {
            clearInterval(timer);
            timer = false;
        }
    };


    complete = function() {
        Progress.ResetTimer();
        NProgress.done();
    };


    pause = function() {
        Progress.ResetTimer();
        NProgress.set(0.0);
    };


    start = function() {
        var step_ms = 250; // animation step in ms
        var steps = (Unsee.GetRefreshRate() * 1000) / step_ms; // how many steps we have
        NProgress.set(0.0);
        Progress.ResetTimer();
        timer = setInterval(function() {
            NProgress.inc(1.0 / steps);
        }, step_ms);
    };


    return {
        Init: init,
        Pause: pause,
        Complete: complete,
        Reset: start,
        ResetTimer: resetTimer
    };

}());

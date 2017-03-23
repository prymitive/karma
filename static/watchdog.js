var Watchdog = (function() {


    var selectors = {
        countdown: '#reload-counter'
    }

    var lastTs = 0;
    var maxLag;
    var timer = false;

    var inCountdown = false;
    var fatalCountdown = 60;
    var fatalReloadTimer = false;
    var fatalCounterTimer = false;


    timerTick = function() {
        if (lastTs == 0) return;

        // don't raise an error if autorefresh is disabled
        if (!Config.GetOption('autorefresh').Get()) return;

        var now = moment().unix();
        if (now - lastTs > maxLag) {
            Grid.Clear();
            $('#errors').html(haml.compileHaml('fatal-error')({
                last_ts: lastTs,
                seconds_left: fatalCountdown
            }));
            Counter.Unknown();
            Summary.Reset();
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


    init = function(interval, tolerance) {
        maxLag = tolerance;
        setInterval(timerTick, interval * 1000);
    }


    updateMaxLag = function(interval) {
        maxLag = Math.max(interval + 50, 300);
    }


    updateTs = function(ts) {
        lastTs = ts;
    }


    getTs = function() {
        return lastTs;
    }

    getFatal = function() {
        return inCountdown;
    }


    return {
        Init: init,
        UpdateTolerance: updateMaxLag,
        Pong: updateTs,
        GetLastUpdate: getTs,
        IsFatal: getFatal
    }

}());

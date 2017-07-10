/* globals Raven */     // raven.js
/* globals moment */    // moment.js

/* globals Alerts, Autocomplete, Colors, Config, Counter, Grid, Filters, Progress, Silence, Summary, Templates, UI, Watchdog */

/* exported Unsee */
var Unsee = (function() {

    var timer = false;
    var version = false;
    var refreshInterval = 15;
    var hiddenAt = false;

    var selectors = {
        refreshButton: "#refresh",
        errors: "#errors",
        instanceErrors: "#instance-errors",
    };

    // when user switches to a different tab but keeps unsee tab open in the background
    // some browsers (like Chrome) will try to apply some forms of throttling for the JS
    // code, to ensure that there are no visual artifacts (like state alerts not removed from the page)
    // redraw all alerts if we detect that the user switches from a different tab to unsee
    var setupPageVisibilityHandler = function() {
        // based on https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
        if (typeof document.hidden !== "undefined" && typeof document.addEventListener !== "undefined") {
            document.addEventListener("visibilitychange", function() {
                if (document.hidden) {
                    // when tab is hidden set a timestamp of that event
                    hiddenAt = moment().utc().unix();
                } else {
                    // when user switches back check if we have a timestamp
                    // and if autorefresh is enable
                    if (hiddenAt && Config.GetOption("autorefresh").Get()) {
                        // get the diff to see how long tab was hidden
                        var diff = moment().utc().unix() - hiddenAt;
                        if (diff > refreshInterval) {
                            // if it was hidden for more than one refresh cycle
                            // then manually refresh alerts to ensure everything
                            // is up to date
                            Unsee.Reload();
                        }
                    }
                    hiddenAt = false;
                }
            }, false);
        }
    };

    var parseAJAXError = function(xhr, textStatus) {
        // default to textStatus, it's usually just "error" string
        var err = textStatus;
        if (xhr.readyState === 0) {
            // ajax() completed but request wasn't send
            err = "Connection to the remote endpoint failed";
        } else if (xhr.responseJSON && xhr.responseJSON.error) {
            // there's response JSON and an error key in it
            err = xhr.responseJSON.error;
        } else if (xhr.responseText) {
            // else check response as a string
            err = xhr.responseText;
        }
        return err;
    };

    var init = function() {
        Progress.Init();

        Config.Init({
            CopySelector: "#copy-settings-with-filter",
            SaveSelector: "#save-default-filter",
            ResetSelector: "#reset-settings"
        });
        Config.Load();

        Counter.Init();
        Summary.Init();
        Grid.Init();
        Autocomplete.Init();
        Filters.Init();
        Watchdog.Init(30, 60*15); // set watchdog to 15 minutes

        $(selectors.refreshButton).click(function() {
            if (!$(selectors.refreshButton).prop("disabled")) {
                Unsee.Reload();
            }
            return false;
        });

        setupPageVisibilityHandler();
    };

    var getRefreshRate = function() {
        return refreshInterval;
    };

    var setRefreshRate = function(seconds) {
        var rate = parseInt(seconds);
        if (isNaN(rate) || rate === null) {
            // if passed rate is incorrect use select value
            rate = Config.GetOption("refresh").Get();
            if (isNaN(rate) || rate === null) {
                // if that's also borked use default 15
                rate = 15;
            }
        }
        // don't allow setting refresh rate lower than 1s
        if (rate < 1) {
            rate = 1;
        }
        refreshInterval = rate;
        Progress.Reset();
    };

    var needsUpgrade = function(responseVersion) {
        if (version === false) {
            version = responseVersion;
            return false;
        }
        return version != responseVersion;
    };

    var updateIsReady = function() {
        Progress.Complete();
        $(selectors.refreshButton).prop("disabled", true);
        Counter.Hide();
    };

    var updateCompleted = function() {
        Counter.Show();
        Filters.UpdateCompleted();
        Progress.Complete();
        $(selectors.refreshButton).prop("disabled", false);
        // hack for fixing padding since input can grow and change height
        $("body").css("padding-top", $(".navbar").height());
    };

    var renderError = function(template, context) {
        Counter.Error();
        Grid.Clear();
        Grid.Hide();
        $(selectors.errors).html(Templates.Render(template, context));
        $(selectors.errors).show();
        Counter.Unknown();
        Summary.Update({});
        document.title = "(◕ O ◕)";
        updateCompleted();
    };

    var handleError = function(err) {
        Raven.captureException(err);
        if (window.console) {
            console.error(err.stack);
        }
        renderError("internalError", {
            name: err.name,
            message: err.message,
            raw: err
        });
        setTimeout(function() {
            Unsee.WaitForNextReload();
        }, 500);
    };

    var upgrade = function() {
        renderError("reloadNeeded", {});
        setTimeout(function() {
            location.reload();
        }, 3000);
    };

    var triggerReload = function() {
        updateIsReady();
        $.ajax({
            url: "alerts.json?q=" + Filters.GetFilters().join(","),
            success: function(resp) {
                Counter.Success();
                if (needsUpgrade(resp.version)) {
                    upgrade();
                } else {
                    if (resp.upstreams.counters.total === 0) {
                        // no upstream to use fail hard
                        Counter.Unknown();
                        $(selectors.instanceErrors).html("");
                        renderError("updateError", {
                            error: "Fatal error",
                            messages: [ "No working Alertmanager server found" ],
                            lastTs: Watchdog.GetLastUpdate()
                        });
                        Unsee.WaitForNextReload();
                    } else if (resp.upstreams.counters.healthy > 0 ) {
                        // we have some healthy upstreams, check for failed ones
                        if (resp.upstreams.counters.failed > 0) {
                            var instances = [];
                            resp.upstreams.instances.sort(function(a, b){
                                if(a.name < b.name) return -1;
                                if(a.name > b.name) return 1;
                                return 0;
                            });
                            $.each(resp.upstreams.instances, function(i, instance){
                                if (instance.error !== "") {
                                    instances.push(instance);
                                }
                            });
                            $(selectors.instanceErrors).html(
                                Templates.Render("instanceError", {
                                    instances: instances
                                })
                            );
                        } else {
                            $(selectors.instanceErrors).html("");
                        }
                        // update_alerts() is cpu heavy so it will block browser from applying css changes
                        // inject tiny delay between addClass() above and update_alerts() so that the browser
                        // have a chance to reflect those updates
                        setTimeout(function() {
                            try {
                                Summary.Update({});
                                Filters.ReloadBadges(resp.filters);
                                Colors.Update(resp.colors);
                                Alerts.Update(resp);
                                updateCompleted();
                                Watchdog.Pong(moment(resp.timestamp));
                                Unsee.WaitForNextReload();
                                if (!Watchdog.IsFatal()) {
                                    $(selectors.errors).html("");
                                    $(selectors.errors).hide("");
                                }
                            } catch (err) {
                                Counter.Unknown();
                                handleError(err);
                                Unsee.WaitForNextReload();
                            }
                        }, 50);
                    } else {
                        // we have upstreams but none is working, fail hard
                        Counter.Unknown();
                        $(selectors.instanceErrors).html("");
                        var failedInstances = [];
                        $.each(resp.upstreams.instances, function(i, instance) {
                            if (instance.error !== "") {
                                failedInstances.push(instance);
                            }
                        });
                        renderError("configError", {
                            instances: failedInstances
                        });
                        Unsee.WaitForNextReload();
                    }
                }
            },
            error: function(xhr, textStatus) {
                Counter.Unknown();
                $(selectors.instanceErrors).html("");
                // if fatal error was already triggered we have error message
                // so don't add new one
                if (!Watchdog.IsFatal()) {
                    var err = Unsee.ParseAJAXError(xhr, textStatus);
                    renderError("updateError", {
                        error: "Backend error",
                        messages: [ err ],
                        lastTs: Watchdog.GetLastUpdate()
                    });
                }
                Unsee.WaitForNextReload();
            }
        });
    };

    var pause = function() {
        Progress.Pause();
        Filters.Pause();
        if (timer !== false) {
            clearInterval(timer);
            timer = false;
        }
    };

    var resume = function() {
        if (Config.GetOption("autorefresh").Get()) {
            Filters.UpdateCompleted();
        } else {
            Filters.Pause();
            return false;
        }
        Progress.Reset();
        if (timer !== false) {
            clearInterval(timer);
        }
        timer = setTimeout(Unsee.Reload, Unsee.GetRefreshRate() * 1000);
    };

    var flash = function() {
        var bg = $("#flash").css("background-color");
        $("#flash").css("display", "block").animate({
            backgroundColor: "#fff"
        }, 300, function() {
            $(this).animate({
                backgroundColor: bg
            }, 100).css("display", "none");
        });
    };

    return {
        Init: init,
        Pause: pause,
        WaitForNextReload: resume,
        Reload: triggerReload,
        GetRefreshRate: getRefreshRate,
        SetRefreshRate: setRefreshRate,
        Flash: flash,
        ParseAJAXError: parseAJAXError
    };

})();

$(document).ready(function() {

    // wrap all inits so we can handle errors
    try {
        // init all elements using bootstrapSwitch
        $(".toggle").bootstrapSwitch();

        // enable tooltips, #settings is a dropdown so it already uses different data-toggle
        $("[data-toggle='tooltip'], #settings").tooltip({
            trigger: "hover"
        });

        Templates.Init();
        UI.Init();
        Silence.Init();
        Unsee.Init();

        // delay initial alert load to allow browser finish rendering
        setTimeout(function() {
            Filters.SetFilters();
        }, 100);
    }  catch (error) {
        Raven.captureException(error);
        if (window.console) {
            console.error("Error: " + error.stack);
        }
        // templates might not be loaded yet, make some html manually
        $("#errors").html(
            "<div class='jumbotron'>" +
            "<h1 class='text-center'>" +
            "Internal error <i class='fa fa-exclamation-circle text-danger'/>" +
            "</h1>" +
            "<div class='text-center'><p>" +
            error.message +
            "</p></div></div>"
        ).show();
    }

});

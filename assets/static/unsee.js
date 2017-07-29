"use strict";

const $ = window.$ = window.jQuery = require("jquery");
const moment = require("moment");
const Raven = require("raven-js");

require("bootstrap-loader");
require("font-awesome-webpack");

require("bootstrap-select");
require("bootstrap-select/dist/css/bootstrap-select.css");

require("loaders.css/loaders.css");
require("loaders.css/loaders.css.js");

require("eonasdan-bootstrap-datetimepicker/src/js/bootstrap-datetimepicker.js");
require("eonasdan-bootstrap-datetimepicker/src/less/bootstrap-datetimepicker-build.less");

require("./favicon.ico");
require("./base.css");

const alerts = require("./alerts");
const autocomplete = require("./autocomplete");
const colors = require("./colors");
const config = require("./config");
const counter = require("./counter");
const grid = require("./grid");
const filters = require("./filters");
const progress = require("./progress");
const silence = require("./silence");
const summary = require("./summary");
const templates = require("./templates");
const ui = require("./ui");
const unsilence = require("./unsilence");
const watchdog = require("./watchdog");

var timer = false;
var version = false;
var refreshInterval = 15;
var hiddenAt = false;

var selectors = {
    refreshButton: "#refresh",
    errors: "#errors",
    instanceErrors: "#instance-errors",
};

function parseAJAXError(xhr, textStatus) {
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
}

function getRefreshRate() {
    return refreshInterval;
}

function setRefreshRate(seconds) {
    var rate = parseInt(seconds);
    if (isNaN(rate) || rate === null) {
        // if passed rate is incorrect use select value
        rate = config.getOption("refresh").Get();
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
    progress.resetTimer();
}

function needsUpgrade(responseVersion) {
    if (version === false) {
        version = responseVersion;
        return false;
    }
    return version != responseVersion;
}

function updateIsReady() {
    progress.complete();
    $(selectors.refreshButton).prop("disabled", true);
    counter.hide();
}

function updateCompleted() {
    counter.show();
    filters.updateDone();
    progress.complete();
    $(selectors.refreshButton).prop("disabled", false);
    // hack for fixing padding since input can grow and change height
    $("body").css("padding-top", $(".navbar").height());
}

function renderError(template, context) {
    counter.markError();
    grid.clear();
    grid.hide();
    $(selectors.errors).html(templates.renderTemplate(template, context));
    $(selectors.errors).show();
    counter.markUnknown();
    summary.update({});
    document.title = "(◕ O ◕)";
    updateCompleted();
}

function resume() {
    if (config.getOption("autorefresh").Get()) {
        filters.updateDone();
    } else {
        filters.setPause();
        return false;
    }
    progress.start();
    if (timer !== false) {
        clearInterval(timer);
    }
    /* eslint-disable no-use-before-define */
    // FIXME circular dependency resume -> triggerReload -> resume -> ...
    timer = setTimeout(triggerReload, getRefreshRate() * 1000);
}

function handleError(err) {
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
        resume();
    }, 500);
}

function upgrade() {
    renderError("reloadNeeded", {});
    setTimeout(function() {
        location.reload();
    }, 3000);
}

function triggerReload() {
    updateIsReady();
    $.ajax({
        url: "alerts.json?q=" + filters.getFilters().join(","),
        success: function(resp) {
            counter.markSuccess();
            if (needsUpgrade(resp.version)) {
                upgrade();
            } else {
                if (resp.upstreams.counters.total === 0) {
                    // no upstream to use fail hard
                    counter.markUnknown();
                    $(selectors.instanceErrors).html("");
                    renderError("updateError", {
                        error: "Fatal error",
                        messages: [ "No working Alertmanager server found" ],
                        lastTs: watchdog.getLastUpdate()
                    });
                    resume();
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
                            templates.renderTemplate("instanceError", {
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
                            summary.update({});
                            filters.reloadBadges(resp.filters);
                            colors.update(resp.colors);
                            alerts.updateAlerts(resp);
                            updateCompleted();
                            watchdog.pong(moment(resp.timestamp));
                            resume();
                            if (!watchdog.isFatal()) {
                                $(selectors.errors).html("");
                                $(selectors.errors).hide("");
                            }
                        } catch (err) {
                            counter.markUnknown();
                            handleError(err);
                            resume();
                        }
                    }, 50);
                } else {
                    // we have upstreams but none is working, fail hard
                    counter.markUnknown();
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
                    resume();
                }
            }
        },
        error: function(xhr, textStatus) {
            counter.markUnknown();
            $(selectors.instanceErrors).html("");
            // if fatal error was already triggered we have error message
            // so don't add new one
            if (!watchdog.isFatal()) {
                var err = parseAJAXError(xhr, textStatus);
                renderError("updateError", {
                    error: "Backend error",
                    messages: [ err ],
                    lastTs: watchdog.getLastUpdate()
                });
            }
            resume();
        }
    });
}

function pause() {
    progress.pause();
    filters.setPause();
    if (timer !== false) {
        clearInterval(timer);
        timer = false;
    }
}

function flash() {
    var bg = $("#flash").css("background-color");
    $("#flash").css("display", "block").animate({
        backgroundColor: "#fff"
    }, 300, function() {
        $(this).animate({
            backgroundColor: bg
        }, 100).css("display", "none");
    });
}

// when user switches to a different tab but keeps unsee tab open in the background
// some browsers (like Chrome) will try to apply some forms of throttling for the JS
// code, to ensure that there are no visual artifacts (like state alerts not removed from the page)
// redraw all alerts if we detect that the user switches from a different tab to unsee
function setupPageVisibilityHandler() {
    // based on https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
    if (typeof document.hidden !== "undefined" && typeof document.addEventListener !== "undefined") {
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                // when tab is hidden set a timestamp of that event
                hiddenAt = moment().utc().unix();
            } else {
                // when user switches back check if we have a timestamp
                // and if autorefresh is enable
                if (hiddenAt && config.getOption("autorefresh").Get()) {
                    // get the diff to see how long tab was hidden
                    var diff = moment().utc().unix() - hiddenAt;
                    if (diff > refreshInterval) {
                        // if it was hidden for more than one refresh cycle
                        // then manually refresh alerts to ensure everything
                        // is up to date
                        triggerReload();
                    }
                }
                hiddenAt = false;
            }
        }, false);
    }
}

function init() {
    progress.init();

    config.init({
        CopySelector: "#copy-settings-with-filter",
        SaveSelector: "#save-default-filter",
        ResetSelector: "#reset-settings"
    });
    config.loadFromCookies();

    counter.init();
    summary.init();
    grid.init();
    autocomplete.init();
    filters.init();
    watchdog.init(30, 60*15); // set watchdog to 15 minutes

    $(selectors.refreshButton).click(function() {
        if (!$(selectors.refreshButton).prop("disabled")) {
            triggerReload();
        }
        return false;
    });

    setupPageVisibilityHandler();
}

exports.init = init;
exports.pause = pause;
exports.resume = resume;
exports.triggerReload = triggerReload;
exports.getRefreshRate = getRefreshRate;
exports.setRefreshRate = setRefreshRate;
exports.flash = flash;
exports.parseAJAXError = parseAJAXError;

$(document).ready(function() {

    // wrap all inits so we can handle errors
    try {
        // init all elements using bootstrapSwitch
        $(".toggle").bootstrapSwitch();

        // enable tooltips, #settings is a dropdown so it already uses different data-toggle
        $("[data-toggle='tooltip'], #settings").tooltip({
            trigger: "hover"
        });

        colors.init($("#alerts").data("static-color-labels").split(" "));
        templates.init();
        ui.init();
        silence.setupSilenceForm();
        unsilence.init();
        init();

        // delay initial alert load to allow browser finish rendering
        setTimeout(function() {
            filters.setFilters();
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

"use strict";

const $ = window.$ = window.jQuery = require("jquery");
const sha1 = require("js-sha1");
const Cookies = require("js-cookie");

require("./jquery.typing-0.3.2.js");
require("corejs-typeahead");
require("bootstrap-tagsinput");
require("bootstrap-tagsinput/dist/bootstrap-tagsinput.css");
require("./bootstrap-tagsinput.less");

const autocomplete = require("./autocomplete");
const unsee = require("./unsee");
const querystring = require("./querystring");
const templates = require("./templates");

var selectors = {
    filter: "#filter",
    icon: "#filter-icon",
    historyMenu: "#historyMenu"
};
var appendsEnabled = true;
var historyStorage;
const historyKey = "filterHistory";

function addBadge(text) {
    $.each($("span.tag"), function(i, tag) {
        if ($(tag).text() == text) {
            var chksum = sha1(text);
            $(tag).prepend("<span class='badge tag-badge' id='tag-counter-" + chksum + "' data-badge-id='" + chksum + "'></span>");
        }
    });
}

function getFilters() {
    return $(selectors.filter).tagsinput("items");
}

function reloadBadges(filterData) {
    $.each(filterData, function(i, filter) {
        $.each($("span.tag-badge"), function(j, tag) {
            if (sha1(filter.text) == $(tag).data("badge-id")) {
                $(tag).html(filter.hits.toString());
                if (filter.isValid === true) {
                    $(tag).parent().addClass("label-info").removeClass("label-danger");
                } else {
                    $(tag).parent().addClass("label-danger").removeClass("label-info");
                }
            }
        });
    });
}

function addFilter(text) {
    $(selectors.filter).tagsinput("add", text);
}

function setUpdating() {
    // visual hint that alerts are reloaded due to filter change
    $(selectors.icon).removeClass("fa-search fa-pause").addClass("fa-circle-o-notch fa-spin");
}

function updateDone() {
    $(selectors.icon).removeClass("fa-circle-o-notch fa-spin fa-pause").addClass("fa-search");
}

function setPause() {
    $(selectors.icon).removeClass("fa-circle-o-notch fa-spin fa-search").addClass("fa-pause");
}

function renderHistory() {
    var historicFilters = [];

    const currentFilterText = getFilters().join(",");

    const history = historyStorage.getItem(historyKey);
    if (history) {
        historicFilters = history.split("\n");
    }

    var historyMenuHTML = templates.renderTemplate("historyMenu", {
        activeFilter: currentFilterText,
        defaultFilter: $(selectors.filter).data("default-filter"),
        savedFilter: Cookies.get("defaultFilter.v2"),
        filters: historicFilters
    });
    $(selectors.historyMenu).html(historyMenuHTML);
}

function appendFilterToHistory(text) {
    // require non empty text and enabled appends
    if (!text || !appendsEnabled) return false;

    // final filter list we'll save to storage
    var filterList = [ text ];

    // get current history list from storage and append it to our final list
    // of filters, but avoid duplicates
    const history = historyStorage.getItem(historyKey);
    if (history) {
        const historyArr = history.split("\n");
        for (var i = 0; i < historyArr.length; i++) {
            var h = historyArr[i];
            if (filterList.indexOf(h) < 0) {
                filterList.push(h);
            }
        }
    }

    // truncate the history to up to 11 elements
    filterList = filterList.slice(0, 11);

    historyStorage.setItem(historyKey, filterList.join("\n"));
}

function setFilters() {
    setUpdating();

    // update location so it's easy to share it
    querystring.update("q", getFilters().join(","));

    // append filter to the history and render it
    appendFilterToHistory(getFilters().join(","));
    renderHistory();

    // reload alerts
    unsee.triggerReload();
}

function init(historyStore) {
    historyStorage = historyStore;
    var initialFilter;

    if ($(selectors.filter).data("default-used") == "false" || $(selectors.filter).data("default-used") === false) {
        // user passed ?q=filter string
        initialFilter = $(selectors.filter).val();
    } else {
        // no ?q=filter string, check if we have default filter cookie
        initialFilter = Cookies.get("defaultFilter.v2");
        if (initialFilter === undefined) {
            // no cookie, use global default
            initialFilter = $(selectors.filter).data("default-filter");
        }
    }

    var initialFilterArr = initialFilter.split(",");
    $(selectors.filter).val("");
    $(".filterbar :input").tagsinput({
        typeaheadjs: {
            minLength: 1,
            hint: true,
            limit: 12,
            name: "autocomplete",
            source: autocomplete.getAutocomplete()
        }
    });
    $.each(initialFilterArr, function(i, filter) {
        $(selectors.filter).tagsinput("add", filter);
        addBadge(filter);
    });

    $(selectors.filter).on("itemAdded itemRemoved", function(event) {
        setFilters();
        // add counter badge to new tag
        if (event.type == "itemAdded") {
            addBadge(event.item);
        }
    });

    $(selectors.filter).tagsinput("focus");

    // stop when user is typing in the filter bar
    $(".bootstrap-tagsinput").typing({
        start: function(event) {
            // ignore backspace & enter
            if (event.keyCode != 8 && event.keyCode != 13) unsee.pause();
        },
        stop: function(event) {
            // ignore enter
            if (event.keyCode != 13) unsee.resume();
        },
        delay: 1000
    });

    // fix body padding if needed, input might endup using more than 1 line
    $(".bootstrap-tagsinput").bind("DOMSubtreeModified", function() {
        $("body").css("padding-top", $(".navbar").height());
    });
    $("input.tt-input").on("change keypress", function() {
        $("body").css("padding-top", $(".navbar").height());
    });

    $(".filterbar").on("resize", function(){
        // hack for fixing padding since input can grow and change height
        $("body").css("padding-top", $(".navbar").height());
    });

    renderHistory();
    $(selectors.historyMenu).on("click", "a.history-menu-item", function(event) {
        var elem = $(event.target).parents("li.history-menu");
        const historyArr = elem.find(".rawFilter").text().trim().split(",");
        // we need to add filters one by one, this would reload alerts on every
        // add() so let's pause reloads and resume once we're done with updating
        // filters
        unsee.pause();
        // disable history appends as it would record each new filter in the
        // history
        appendsEnabled = false;
        $(selectors.filter).tagsinput("removeAll");
        for (var i = 0; i < historyArr.length; i++) {
            $(selectors.filter).tagsinput("add", historyArr[i]);
        }
        // enable everything again
        appendsEnabled = true;
        unsee.resume();
    });

}

exports.init = init;
exports.addFilter = addFilter;
exports.setFilters = setFilters;
exports.getFilters = getFilters;
exports.addBadge = addBadge;
exports.reloadBadges = reloadBadges;
exports.updateDone = updateDone;
exports.setUpdating = setUpdating;
exports.setPause = setPause;
exports.renderHistory = renderHistory;

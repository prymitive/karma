"use strict";

const $ = window.$ = window.jQuery = require("jquery");
const sha1 = require("js-sha1");
const Cookies = require("js-cookie");

require("./jquery.typing-0.3.2.js");
require("corejs-typeahead");
require("bootstrap-tagsinput");
require("bootstrap-tagsinput/dist/bootstrap-tagsinput.css");
require("bootstrap-tagsinput/dist/bootstrap-tagsinput-typeahead.css");

const autocomplete = require("./autocomplete");
const unsee = require("./unsee");
const querystring = require("./querystring");

var selectors = {
    filter: "#filter",
    icon: "#filter-icon"
};

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

function setFilters() {
    setUpdating();

    // update location so it's easy to share it
    querystring.update("q", getFilters().join(","));

    // reload alerts
    unsee.triggerReload();
}

function init() {
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
            if (event.keyCode != 8 && event.keyCode != 13) unsee.pause();
        },
        stop: function(event) {
            if (event.keyCode != 8 && event.keyCode != 13) unsee.resume();
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

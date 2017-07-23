"use strict";

const $ = require("jquery");
const Cookies = require("js-cookie");
const Clipboard = require("clipboard");

const filters = require("./filters");
const Option = require("./option");
const unsee = require("./unsee");
const querystring = require("./querystring");

var options = {};

function newOption(params) {
    var opt = new Option(params);
    opt.Init();
    options[opt.QueryParam] = opt;
}

function getOption(queryParam) {
    return options[queryParam];
}

function loadFromCookies() {
    $.each(options, function(name, option) {
        var value = option.Load();
        if (value !== undefined) {
            option.Set(value);
        }
    });
}

function reset() {
    // this is not part of options map
    Cookies.remove("defaultFilter.v2");
    $.each(options, function(name, option) {
        Cookies.remove(option.Cookie);
    });
}

function init(params) {

    // copy current filter button action
    new Clipboard(params.CopySelector, {
        text: function(elem) {
            var baseUrl = [ location.protocol, "//", location.host, location.pathname ].join("");
            var query = [ "q=" + filters.getFilters().join(",") ];
            $.each(options, function(name, option) {
                query.push(option.QueryParam + "=" + option.Get().toString());
            });
            $(elem).finish().fadeOut(100).fadeIn(300);
            return baseUrl + "?" + query.join("&");
        }
    });

    // save settings button action
    $(params.SaveSelector).on("click", function() {
        var filter = filters.getFilters().join(",");
        Cookies.set("defaultFilter.v2", filter, {
            expires: 365,
            path: ""
        });
        $(params.SaveSelector).finish().fadeOut(100).fadeIn(300);
    });

    // reset settings button action
    $(params.ResetSelector).on("click", function() {
        reset();
        querystring.remove("q");
        location.reload();
    });

    // https://github.com/twbs/bootstrap/issues/2097
    $(document).on("click", ".dropdown-menu.dropdown-menu-form", function(e) {
        e.stopPropagation();
    });

    newOption({
        Cookie: "autoRefresh",
        QueryParam: "autorefresh",
        Selector: "#autorefresh",
        Action: function(val) {
            if (val) {
                unsee.resume();
            } else {
                unsee.pause();
            }
        }
    });

    newOption({
        Cookie: "refreshInterval",
        QueryParam: "refresh",
        Selector: "#refresh-interval",
        Init: function() {
            var elem = this;
            $(this.Selector).on("change", function() {
                var val = elem.Get();
                elem.Save(val);
                elem.Action(val);
            });
        },
        Getter: function() {
            return $(this.Selector).val();
        },
        Setter: function(val) {
            $(this.Selector).val(parseInt(val));
        },
        Action: function(val) {
            unsee.setRefreshRate(parseInt(val));
        }
    });


    newOption({
        Cookie: "showFlash",
        QueryParam: "flash",
        Selector: "#show-flash"
    });

    newOption({
        Cookie: "appendTop",
        QueryParam: "appendtop",
        Selector: "#append-top"
    });

}

exports.init = init;
exports.reset = reset;
exports.loadFromCookies = loadFromCookies;
exports.newOption = newOption;
exports.getOption = getOption;

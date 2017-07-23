"use strict";

const $ = require("jquery");
require("bootstrap-switch");
const Cookies = require("js-cookie");

const querystring = require("./querystring");

function Option(params) {
    this.Cookie = params.Cookie;
    this.QueryParam = params.QueryParam;
    this.Selector = params.Selector;
    this.Get = params.Getter || function() {
        return $(this.Selector).is(":checked");
    };
    this.Set = params.Setter || function(val) {
        $(this.Selector).bootstrapSwitch("state", $.parseJSON(val), true);
    };
    this.Action = params.Action || function() {};
    this.Init = params.Init || function() {
        var elem = this;
        $(this.Selector).on("switchChange.bootstrapSwitch", function(event, val) {
            elem.Save(val);
            elem.Action(val);
        });
    };
}

Option.prototype.Load = function() {
    var currentVal = this.Get();

    var val = Cookies.get(this.Cookie);
    if (val !== undefined) {
        this.Set(val);
    }

    var q = querystring.parse();
    if (q[this.QueryParam] !== undefined) {
        this.Set(q[this.QueryParam]);
        val = q[this.QueryParam];
    }

    if (currentVal != val) {
        this.Action(val);
    }
};

Option.prototype.Save = function(val) {
    Cookies.set(this.Cookie, val, {
        expires: 365,
        path: ""
    });
};

module.exports = Option;

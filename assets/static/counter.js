"use strict";

const Favico = require("favico.js");
const $ = require("jquery");

var selectors = {
    counter: "#alert-count",
    spinner: "#spinner"
};

var favicon = false;

function hide() {
    $(selectors.counter).hide();
    $(selectors.spinner).children().removeClass("spinner-success spinner-error");
    $(selectors.spinner).show();
}

function show() {
    $(selectors.spinner).hide();
    $(selectors.counter).show();
}

function setCounter(val) {
    favicon.badge(val);
    show();
    $(selectors.counter).html(val);
    // set alert count css based on the number of alerts
    if (val === 0) {
        $(selectors.counter).removeClass("text-warning text-danger").addClass("text-success");
        document.title = "(◕‿◕)";
    } else if (val < 10) {
        $(selectors.counter).removeClass("text-success text-danger").addClass("text-warning");
        document.title = "(◕_◕)";
    } else {
        $(selectors.counter).removeClass("text-success text-warning").addClass("text-danger");
        document.title = "(◕︵◕)";
    }
}

function markUnknown() {
    favicon.badge("?");
    show();
    $(selectors.counter).html("?");
    $(selectors.counter).removeClass("text-success text-warning text-danger");
}

function markError() {
    $(selectors.spinner).children().removeClass("spinner-success").addClass("spinner-error");
}

function markSuccess() {
    $(selectors.spinner).children().addClass("spinner-success");
}

function init() {
    favicon = new Favico({
        animation: "none",
        position: "up",
        bgColor: "#333",
        textColor: "#ff0"
    });
    markUnknown();
}

exports.init = init;
exports.hide = hide;
exports.show = show;
exports.setCounter = setCounter;
exports.markError = markError;
exports.markSuccess = markSuccess;
exports.markUnknown = markUnknown;

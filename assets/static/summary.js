"use strict";

const $ = require("jquery");

const colors = require("./colors");
const templates = require("./templates");

var summary = {};

function render() {
    var topTags = [];
    $.each(summary, function(k, v) {
        topTags.push({
            name: k,
            val: v
        });
    });
    topTags.sort(function(a, b) {
        if (a.val > b.val) return 1;
        if (a.val < b.val) return -1;
        if (a.name > b.name) return -1;
        if (a.name < b.name) return 1;
        return 0;
    }).reverse();

    var tags = [];
    $.each(topTags.slice(0, 10), function(i, tag) {
        var labelKey = tag.name.split(": ")[0];
        var labelVal = tag.name.split(": ")[1];
        tag.style = colors.getStyle(labelKey, labelVal);
        tag.cls = colors.getClass(labelKey, labelVal);
        tags.push(tag);
    });

    return templates.renderTemplate("breakdownContent", {tags: tags});
}

function init() {
    summary = {};
    $(".navbar-header").popover({
        trigger: "hover",
        delay: {
            "show": 500,
            "hide": 100
        },
        container: "body",
        html: true,
        placement: "bottom",
        title: "Top labels",
        content: render,
        template: templates.renderTemplate("breakdown", {})
    });
}

function update(data) {
    summary = data;
}

function reset() {
    summary = {};
    render();
}

function push(labelKey, labelVal) {
    var l = labelKey + ": " + labelVal;
    if (summary[l] === undefined) {
        summary[l] = 1;
    } else {
        summary[l]++;
    }
}

function getCount(labelKey, labelVal) {
    var l = labelKey + ": " + labelVal;
    return summary[l];
}

exports.init = init;
exports.update = update;
exports.reset = reset;
exports.push = push;
exports.getCount = getCount;
exports.render = render;

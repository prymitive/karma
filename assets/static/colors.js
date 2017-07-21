const $ = require("jquery");

var colors = {},
    staticColorLabels = [];

var specialLabels = {
    "@state: unprocessed": "label-default",
    "@state: active": "label-danger",
    "@state: suppressed": "label-success",
};

function init(staticColors) {
    staticColorLabels = staticColors;
}

function getStaticLabels() {
    return staticColorLabels;
}

function isStaticLabel(key) {
    return ($.inArray(key, getStaticLabels()) >= 0);
}

function update(colorData) {
    colors = colorData;
}

function merge(colorData) {
    $.extend(colors, colorData);
}

function getClass(key, value) {
    var label = key + ": " + value;
    if (key === "alertname") {
        return "label-primary";  // special case for alertname label, which is the name of alert
    } else if (specialLabels[label] !== undefined) {
        return specialLabels[label];
    } else if (isStaticLabel(key)) {
        return "label-info";
    } else {
        return "label-warning";
    }
}

function getStyle(key, value) {
    // get color data, returned as css style string
    var style = "";
    if (colors[key] !== undefined && colors[key][value] !== undefined) {
        var c = colors[key][value];
        style = "background-color: rgba(" + [ c.background.red, c.background.green, c.background.blue, c.background.alpha ].join(", ") + "); ";
        style += "color: rgba(" + [ c.font.red, c.font.green, c.font.blue, c.font.alpha ].join(", ") + "); ";
    }
    return style;
}

exports.init = init;
exports.update = update;
exports.merge = merge;
exports.getStyle = getStyle;
exports.getClass = getClass;
exports.getStaticLabels = getStaticLabels;
exports.isStaticLabel = isStaticLabel;

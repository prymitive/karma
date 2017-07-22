const Masonry = require("masonry-layout");
const $ = require("jquery");

var selectors = {
    alerts: "#alerts",
    incident: ".incident",
    gridSizer: ".grid-sizer",
};

var grid;

function init() {
    grid = Masonry($(selectors.alerts), {
        itemSelector: selectors.incident,
        columnWidth: selectors.gridSizer,
        percentPosition: true,
        transitionDuration: "0.4s",
        hiddenStyle: {
            opacity: 0
        },
        visibleStyle: {
            opacity: 1
        }
    });
}

function clear() {
    grid.masonry("remove", $(selectors.incident));
    $(selectors.incident).remove();
}

function redraw() {
    grid.masonry("layout");
}

function remove(elem) {
    grid.masonry("remove", elem);
}

function append(elem) {
    if (Config.GetOption("appendtop").Get()) {
        grid.prepend(elem).masonry("prepended", elem);
    } else {
        grid.append(elem).masonry("appended", elem);
    }
}

function items() {
    return grid.masonry("getItemElements");
}

function hide() {
    $(selectors.alerts).hide();
}

function show() {
    $(selectors.alerts).show();
}

exports.init = init;
exports.clear = clear;
exports.redraw = redraw;
exports.hide = hide;
exports.show = show;
exports.append = append;
exports.remove = remove;
exports.items = items;

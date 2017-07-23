const $ = require("jquery");

test("ui init()", () => {
    window.jQuery = require("jquery");
    const ui = require("./ui");
    ui.init();
});

test("ui setupAlertGroupUI()", () => {
    window.jQuery = require("jquery");
    const ui = require("./ui");
    ui.setupAlertGroupUI($("<div></div>"));
});

test("ui setupGroupTooltips()", () => {
    window.jQuery = require("jquery");
    const ui = require("./ui");
    ui.setupGroupTooltips($("<div></div>"));
});

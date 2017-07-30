const $ = window.$ = window.jQuery = require("jquery");

test("ui init()", () => {
    const ui = require("./ui");
    ui.init();
});

test("ui setupAlertGroupUI()", () => {
    const ui = require("./ui");
    ui.setupAlertGroupUI($("<div></div>"));
});

test("ui setupGroupTooltips()", () => {
    document.body.innerHTML =
        "<div id='groupTest'>" +
        "  <span id='foo' title='foo' data-toggle='tooltip'></span>" +
        "  <span id='bar' data-ts-title='bar' data-toggle='tooltip'></span>" +
        "</div>";
    require("bootstrap/js/tooltip.js");
    const ui = require("./ui");
    ui.setupGroupTooltips($("#groupTest"));
    // check if bootstrap tooltip was applied, it will empty tooltip attr if set
    // and save it under data-original-title
    expect($("#foo").attr("title")).toBe("");
    expect($("#foo").data("original-title")).toBe("foo");
    expect($("#bar").attr("title")).toBe("");
    expect($("#bar").data("original-title")).toBe("");
});

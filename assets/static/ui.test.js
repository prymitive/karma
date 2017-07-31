const $ = window.$ = window.jQuery = require("jquery");

jest.useFakeTimers();

test("ui setupModal()", () => {
    document.body.innerHTML =
        "<script type='application/json' id='modal-title'>title</script>" +
        "<script type='application/json' id='modal-body'><%- hints %></script>" +
        "<div class='modal' id='labelModal' tabindex='-1' role='dialog'>" +
        "  <div class='modal-dialog' role='document'>" +
        "    <div class='modal-content'>" +
        "      <div class='modal-header text-center'>" +
        "        <div class='modal-title'></div>" +
        "      </div>" +
        "    <div class='modal-body'></div>" +
        "  </div>" +
        "</div>" +
        "<div id='label' type='button'" +
        "     data-label-type='filter'" +
        "     data-label-key='foo'" +
        "     data-label-val='bar'" +
        "     data-toggle='modal'" +
        "     data-target='#labelModal'>" +
        "</div>";
    // mock modal templates
    const templates = require("./templates");
    templates.loadTemplate("modalTitle", "#modal-title");
    templates.loadTemplate("modalBody", "#modal-body");

    require("bootstrap/js/modal.js");
    const ui = require("./ui");
    ui.setupModal();
    // modal shouldn't be visible (no in class)
    expect($("#labelModal").hasClass("in")).toBe(false);

    // trigger modal show
    $("#label").click();
    jest.runAllTimers();
    // modal should be visible (with in class)
    expect($("#labelModal").hasClass("in")).toBe(true);
    // we should have hints in the body
    expect($(".modal-body").text()).toBe("foo=bar,foo!=bar");
});

test("ui setupGroupLinkHover()", () => {
    document.body.innerHTML =
        "<div id='links'>" +
        "  <span class='alert-group-link'>" +
        "    <a href='#'>link</a>" +
        "  </span>" +
        "</div>";
    const ui = require("./ui");
    ui.setupGroupLinkHover($("#links"));

    // trigger hover, link should be visible
    $("#links").trigger("mouseenter");
    jest.runAllTimers();
    expect($("a").attr("style")).toBe("opacity: 100;");

    // disable hover, , link should be invisible (fully transparent)
    $("#links").trigger("mouseleave");
    jest.runAllTimers();
    expect($("a").attr("style")).toBe("opacity: 0;");
});

test("ui setupGroupTooltips()", () => {
    document.body.innerHTML =
        "<div id='groupTest'>" +
        "  <div id='foo' title='foo' data-toggle='tooltip'>foo</div>" +
        "  <div id='bar' data-ts-title='bar' data-toggle='tooltip'>bar</div>" +
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

    // trigger hover events for foo
    $("#foo").trigger("mouseenter");
    // fast forward all timers since there's a delay for tooltip show
    jest.runAllTimers();
    // check if tooltip was added to the DOM with the right text
    expect($(".tooltip-inner").text()).toBe("foo");

    // hide foo tooltip and check if it's gone
    $("#foo").trigger("mouseleave");
    jest.runAllTimers();
    expect($(".tooltip-inner").length).toBe(0);

    // repeat for bar
    $("#bar").trigger("mouseenter");
    // fast forward all timers since there's a delay for tooltip show
    jest.runAllTimers();
    // check if tooltip was added to the DOM with the right text
    expect($(".tooltip-inner").text()).toBe("bar");
});

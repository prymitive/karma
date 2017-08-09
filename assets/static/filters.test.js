const $ = window.jQuery = require("jquery");
require("./__mocks__/localStorageMock");

test("filters addBadge()", () => {
    const filters = require("./filters");
    filters.addBadge("foo=bar");
});

test("default filter should be in history after setting filter to foo", () => {
    localStorage.clear();
    document.body.innerHTML =
        "<div class='input-group filterbar'>" +
        "  <div class='input-group-addon input-sm'>" +
        "    <i class='fa fa-search' id='filter-icon'></i>" +
        "  </div>" +
        "  <input id='filter' type='text' value='foo' data-default-used='false' data-default-filter='default'>" +
        "</div>" +
        "<div id='historyMenu'></div>";

    const templatesMock = require("./__mocks__/templatesMock");
    document.body.innerHTML += templatesMock.loadTemplates();
    const templates = require("./templates");
    templates.init();

    const autocomplete = require("./autocomplete");
    const filters = require("./filters");

    autocomplete.init();
    filters.init();
    filters.setFilters();
    filters.renderHistory();

    var elems = $("#historyMenu").find(".rawFilter");
    // foo is active so should only get default
    expect(elems.length).toBe(1);
    expect($(elems[0]).text().trim()).toBe("default");
    // we set foo, so that what should be in history
    expect(localStorage.getItem("filterHistory")).toBe("foo");
});

test("appended filtes should be present in history", () => {
    localStorage.clear();
    document.body.innerHTML =
        "<div class='input-group filterbar'>" +
        "  <div class='input-group-addon input-sm'>" +
        "    <i class='fa fa-search' id='filter-icon'></i>" +
        "  </div>" +
        "  <input id='filter' type='text' value='default' data-default-used='true' data-default-filter='default'>" +
        "</div>" +
        "<div id='historyMenu'></div>";

    const templatesMock = require("./__mocks__/templatesMock");
    document.body.innerHTML += templatesMock.loadTemplates();
    const templates = require("./templates");
    templates.init();

    const autocomplete = require("./autocomplete");
    const filters = require("./filters");

    autocomplete.init();
    filters.init();
    filters.setFilters();
    filters.renderHistory();

    // default is used, expect single history entry
    var elems = $("#historyMenu").find(".rawFilter");
    expect(elems.length).toBe(1);
    // default is used but default is always rendered so should be there
    expect($(elems[0]).text().trim()).toBe("default");
    // and that's what history should have
    expect(localStorage.getItem("filterHistory")).toBe("default");

    // now we append more filters, so q=default becomes q=default,bar
    filters.addFilter("bar");
    filters.setFilters();

    elems = $("#historyMenu").find(".rawFilter");
    expect(elems.length).toBe(2);
    // default will be repeated because it's both: last filter and the defult
    // that's always rendered
    expect($(elems[0]).text().trim()).toBe("default");
    expect($(elems[1]).text().trim()).toBe("default");
    expect(
        localStorage.getItem("filterHistory").split("\n")
    ).toMatchObject(
        [ "default,bar", "default" ]
    );

    // append another filter, so we now have: q=default,bar,@state=active
    filters.addFilter("@state=active");
    filters.setFilters();

    elems = $("#historyMenu").find(".rawFilter");
    expect(elems.length).toBe(3);
    // default will be repeated because it's both: last filter and the defult
    // that's always rendered
    expect($(elems[0]).text().trim()).toBe("default,bar");
    expect($(elems[1]).text().trim()).toBe("default");
    expect($(elems[1]).text().trim()).toBe("default");
    expect(
        localStorage.getItem("filterHistory").split("\n")
    ).toMatchObject(
        [ "default,bar,@state=active", "default,bar", "default" ]
    );
});

const $ = window.jQuery = require("jquery");
const LocalStorageMock = require("./__mocks__/localStorageMock");

test("filters addBadge()", () => {
    const filters = require("./filters");
    filters.addBadge("foo=bar");
});

test("default filter should be in history after setting filter to foo", () => {
    LocalStorageMock.clear();
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
    filters.init(LocalStorageMock);
    filters.setFilters();
    filters.renderHistory();

    // use snapshot to check that generated HTML is what we expect
    const historyMenu = $("#historyMenu").html().trim();
    expect(historyMenu).toMatchSnapshot();

    // we set foo, so that what should be in history
    expect(LocalStorageMock.getItem("filterHistory")).toBe("foo");
});

test("appended filtes should be present in history", () => {
    LocalStorageMock.clear();
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
    filters.init(LocalStorageMock);
    filters.setFilters();
    filters.renderHistory();

    // we only used default, so there should be a single (default) entry
    let historyMenu = $("#historyMenu").html().trim();
    expect(historyMenu).toMatchSnapshot();
    // and that's what history should have
    expect(LocalStorageMock.getItem("filterHistory")).toBe("default");

    // now we append more filters, so q=default becomes q=default,bar
    filters.addFilter("bar");
    filters.setFilters();
    // now we got non-default filter as active, so we should have 2 entries
    // both for default (as recent and as global default)
    historyMenu = $("#historyMenu").html().trim();
    expect(historyMenu).toMatchSnapshot();
    expect(
        LocalStorageMock.getItem("filterHistory").split("\n")
    ).toMatchObject(
        [ "default,bar", "default" ]
    );

    // append another filter, so we now have: q=default,bar,@state=active
    filters.addFilter("@state=active");
    filters.setFilters();
    // now we should have 3 entries, 2x default + default,bar
    historyMenu = $("#historyMenu").html().trim();
    expect(historyMenu).toMatchSnapshot();
    expect(
        LocalStorageMock.getItem("filterHistory").split("\n")
    ).toMatchObject(
        [ "default,bar,@state=active", "default,bar", "default" ]
    );

    // clear filters, so now we have: q=
    filters.clearFilters();
    filters.setFilters();
    // now we should have 4 entries, 2x default + default,bar + default,bar,@state=active
    historyMenu = $("#historyMenu").html().trim();
    expect(historyMenu).toMatchSnapshot();
    expect(
        LocalStorageMock.getItem("filterHistory").split("\n")
    ).toMatchObject(
        [ "default,bar,@state=active", "default,bar", "default" ]
    );

    // now add a filter back, so now we have: q=@state=active
    filters.addFilter("@state=active");
    filters.setFilters();
    // we should have same filters as before
    historyMenu = $("#historyMenu").html().trim();
    expect(historyMenu).toMatchSnapshot();
    expect(
        LocalStorageMock.getItem("filterHistory").split("\n")
    ).toMatchObject(
        [ "@state=active", "default,bar,@state=active", "default,bar", "default" ]
    );

    // as a last test add default back to have @state=active rendered
    filters.clearFilters();
    filters.addFilter("default");
    filters.setFilters();
    // we should have same filters as before
    historyMenu = $("#historyMenu").html().trim();
    expect(historyMenu).toMatchSnapshot();
    // default should move from the bottom to to top of the list
    expect(
        LocalStorageMock.getItem("filterHistory").split("\n")
    ).toMatchObject(
        [ "default", "@state=active", "default,bar,@state=active", "default,bar" ]
    );
});

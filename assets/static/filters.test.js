test("filters addBadge()", () => {
    // mock data attr with default filter
    //document.body.innerHTML = "<div id='filter' data-default-filter='foo=bar'></div>";
    window.jQuery = require("jquery");
    const filters = require("./filters");
    filters.addBadge("foo=bar");
});

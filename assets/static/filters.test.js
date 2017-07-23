const filters = require("./filters");

test("filters addBadge()", () => {
    // mock data attr with default filter
    //document.body.innerHTML = "<div id='filter' data-default-filter='foo=bar'></div>";
    filters.addBadge("foo=bar");
});

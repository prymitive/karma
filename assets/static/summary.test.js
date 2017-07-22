const $ = require("jquery");

const summary = require("./summary");
const templates = require("./templates");

test("summary", () => {
    // mock templates
    var elems = [];
    $.each(templates.getConfig(), function(name, selector) {
        elems.push(
            "<script type='application/json' id='" + selector.slice(1) + "'>" +
            "<% _.each(tags, function(tag) { %>" +
            "name=<%= tag.name %> val=<%= tag.val %> " +
            "<% }) %>" +
            "</script>"
        );
    });
    document.body.innerHTML = elems.join("\n");
    templates.init();

    // load bootstrap, but first set global jQuery object it needs
    global.jQuery = $;
    require("bootstrap");

    summary.init();

    // should be empty with no data
    expect(summary.render()).toBe("");

    // update data and re-test
    summary.update({"foo": 1});
    expect(summary.render()).toBe("name=foo val=1 ");

    summary.update({"foo": 1, "bar": 22});
    expect(summary.render()).toBe("name=bar val=22 name=foo val=1 ");

    // try pushing individual values
    expect(summary.getCount("xx", "y")).toBeUndefined();
    summary.push("xx", "y");
    expect(summary.getCount("xx", "y")).toBe(1);
    summary.push("xx", "y");
    expect(summary.getCount("xx", "y")).toBe(2);
    summary.push("xx", "y");
    expect(summary.getCount("xx", "y")).toBe(3);

    expect(summary.render()).toBe("name=bar val=22 name=xx: y val=3 name=foo val=1 ");

    // reset values
    summary.reset();
    expect(summary.getCount("xx", "y")).toBeUndefined();
    expect(summary.render()).toBe("");
});

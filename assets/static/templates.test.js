const $ = require("jquery");
const templates = require("./templates");
const templatesMock = require("./__mocks__/templatesMock");

test("templates init()", () => {
    var elems = [];
    $.each(templates.getConfig(), function(name, selector) {
        elems.push("<div class='" + name + "' id='" + selector.slice(1) + "'></div>");
    });
    document.body.innerHTML = templatesMock.loadTemplates();
    templates.init();
});

const templates = require("./templates");
const templatesMock = require("./__mocks__/templatesMock");

test("templates init()", () => {
    document.body.innerHTML = templatesMock.loadTemplates();
    templates.init();
});

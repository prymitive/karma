test("help imports", () => {
    window.jQuery = require("jquery");
    require("./help");
});

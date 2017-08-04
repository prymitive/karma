test("config init()", () => {
    window.jQuery = require("jquery");
    const config = require("./config");
    config.init({
        CopySelector: "#copy-settings-with-filter",
        SaveSelector: "#save-default-filter",
        ResetSelector: "#reset-settings"
    });
});

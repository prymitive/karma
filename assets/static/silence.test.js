test("silence setupSilenceForm()", () => {
    window.jQuery = require("jquery");
    const silence = require("./silence");
    silence.setupSilenceForm();
});

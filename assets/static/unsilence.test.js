test("silence setupSilenceForm()", () => {
    window.jQuery = require("jquery");
    const unsilence = require("./unsilence");
    unsilence.init();
});

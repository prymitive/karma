const progress = require("./progress");

test("progress init()", () => {
    progress.init();
});

test("progress resetTimer()", () => {
    progress.resetTimer();
});

test("progress complete()", () => {
    progress.complete();
});

test("progress pause()", () => {
    progress.pause();
});

const $ = require("jquery");

const counter = require("./counter");

const mockHTML =
    "<div>" +
    "  <div id='alert-count' ></div>" +
    "  <div id='spinner' >" +
    "    <span id='spinner-child'></span>" +
    "  </div>" +
    "</div>";

test("counter & spinner visibility after hide() & show()", () => {
    document.body.innerHTML = mockHTML;

    counter.init();
    expect($("#alert-count").css("display")).not.toEqual("none");
    expect($("#spinner").css("display")).toEqual("none");

    counter.hide();
    expect($("#alert-count").css("display")).toEqual("none");
    expect($("#spinner").css("display")).not.toEqual("none");

    counter.show();
    expect($("#alert-count").css("display")).not.toEqual("none");
    expect($("#spinner").css("display")).toEqual("none");

    counter.hide();
    expect($("#alert-count").css("display")).toEqual("none");
    expect($("#spinner").css("display")).not.toEqual("none");

    counter.setCounter(0);
    expect($("#alert-count").css("display")).not.toEqual("none");
    expect($("#spinner").css("display")).toEqual("none");
});

test("counter colors are correct", () => {
    document.body.innerHTML = mockHTML;

    counter.init();
    expect($("#alert-count").hasClass("text-success")).toBe(false);
    expect($("#alert-count").hasClass("text-warning")).toBe(false);
    expect($("#alert-count").hasClass("text-danger")).toBe(false);

    counter.setCounter(0);
    expect(document.title).toBe("(◕‿◕)");
    expect($("#alert-count").hasClass("text-success")).toBe(true);
    expect($("#alert-count").hasClass("text-warning")).toBe(false);
    expect($("#alert-count").hasClass("text-danger")).toBe(false);

    for (var i = 1; i < 10; i++) {
        counter.setCounter(i);
        expect(document.title).toBe("(◕_◕)");
        expect($("#alert-count").hasClass("text-success")).toBe(false);
        expect($("#alert-count").hasClass("text-warning")).toBe(true);
        expect($("#alert-count").hasClass("text-danger")).toBe(false);
    }

    for (i = 10; i < 20; i++) {
        counter.setCounter(i);
        expect(document.title).toBe("(◕︵◕)");
        expect($("#alert-count").hasClass("text-success")).toBe(false);
        expect($("#alert-count").hasClass("text-warning")).toBe(false);
        expect($("#alert-count").hasClass("text-danger")).toBe(true);
    }
});

test("spinner children is red after error", () => {
    document.body.innerHTML = mockHTML;

    counter.init();
    counter.markError();
    expect($("#spinner-child").hasClass("spinner-success")).toBe(false);
    expect($("#spinner-child").hasClass("spinner-error")).toBe(true);
});

test("spinner children is green after success", () => {
    document.body.innerHTML = mockHTML;

    counter.init();
    counter.markSuccess();
    expect($("#spinner-child").hasClass("spinner-success")).toBe(true);
    expect($("#spinner-child").hasClass("spinner-error")).toBe(false);
});

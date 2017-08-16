const $ = window.jQuery = require("jquery");
const templatesMock = require("./__mocks__/templatesMock");

test("unsilence init()", () => {
    var body = templatesMock.loadTemplates();
    body.push(
        "<button class='silence-delete'" +
        "        data-alertmanager-uri='http://localhost'" +
        "        data-silence-id='abcd'>" +
        "        <span class='fa fa-trash-o'></span>" +
        "</button>"
    );
    document.body.innerHTML = body;

    require("bootstrap/js/tooltip.js");
    const unsilence = require("./unsilence");

    const ajaxMock = require("./__mocks__/ajaxSuccessMock").ajaxSuccessMockServer();
    ajaxMock.start();

    unsilence.init();
    // icon should be trash-o before clicking
    expect($("button > span.fa").hasClass("fa-trash-o")).toBe(true);
    $("button.silence-delete").click();
    // and switch to green check mark in circle after
    expect($("button > span.fa").hasClass("fa-trash-o")).toBe(false);
    expect($("button > span.fa").hasClass("fa-check-circle")).toBe(true);
    expect($("button > span.fa").hasClass("text-success")).toBe(true);

    ajaxMock.stop();
});

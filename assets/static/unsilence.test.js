const $ = window.jQuery = require("jquery");
const templatesMock = require("./__mocks__/templatesMock");
const ajaxMock = require("./__mocks__/ajaxMock");

const unsilenceButtonHTML =
    "<button class='silence-delete'" +
    "        data-alertmanager-uri='http://localhost'" +
    "        data-silence-id='abcd'>" +
    "        <span class='fa fa-trash-o'></span>" +
    "</button>";

jest.useFakeTimers();

test("unsilence button icons after success", () => {
    var body = templatesMock.loadTemplates();
    body.push(unsilenceButtonHTML);
    document.body.innerHTML = body;

    require("bootstrap/js/tooltip.js");
    const unsilence = require("./unsilence");

    const ajaxServer = ajaxMock.createServer(200, {"status":"success"});
    ajaxServer.start();

    unsilence.init();
    // icon should be trash-o before clicking
    expect($("button > span.fa").hasClass("fa-trash-o")).toBe(true);
    $("button.silence-delete").click();
    // and switch to green check mark in circle after
    expect($("button > span.fa").hasClass("fa-trash-o")).toBe(false);
    expect($("button > span.fa").hasClass("fa-check-circle")).toBe(true);
    expect($("button > span.fa").hasClass("text-success")).toBe(true);

    ajaxServer.stop();
});

test("unsilence button icons after failed delete", () => {
    var body = templatesMock.loadTemplates();
    body.push(unsilenceButtonHTML);
    document.body.innerHTML = body;

    require("bootstrap/js/tooltip.js");
    const unsilence = require("./unsilence");

    const ajaxServer = ajaxMock.createServer(500, {
        "status": "error",
        "errorType": "server_error",
        "error": "end time must not be modified for elapsed silence"
    });
    ajaxServer.start();

    unsilence.init();
    // icon should be trash-o before clicking
    expect($("button > span.fa").hasClass("fa-trash-o")).toBe(true);
    $("button.silence-delete").click();
    // and switch to green check mark in circle after
    expect($("button > span.fa").hasClass("fa-trash-o")).toBe(false);
    expect($("button > span.fa").hasClass("fa-exclamation-circle")).toBe(true);
    expect($("button > span.fa").hasClass("text-danger")).toBe(true);

    // run timers, it should reset the icon back to trash-o
    jest.runOnlyPendingTimers();
    expect($("button > span.fa").hasClass("fa-trash-o")).toBe(true);

    ajaxServer.stop();
});

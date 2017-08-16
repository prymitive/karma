const $ = window.jQuery = require("jquery");
const templatesMock = require("./__mocks__/templatesMock");
const ajaxMock = require("./__mocks__/ajaxMock");

test("silence setupSilenceForm()", () => {
    var body = templatesMock.loadTemplates();
    document.body.innerHTML = body;

    const silence = require("./silence");
    silence.setupSilenceForm();
});

test("successful sendSilencePOST()", () => {
    var body = templatesMock.loadTemplates();
    body.push(
        "<span class='silence-post-result' " +
        "      data-uri='http://localhost'>" +
        "</span>"
    );
    document.body.innerHTML = body;

    const templates = require("./templates");
    templates.init();

    const ajaxServer = ajaxMock.createServer(200, {
        "status": "success",
        "data": {"silenceId": "abcdef"}
    });
    ajaxServer.start();

    const silence = require("./silence");
    silence.sendSilencePOST("http://localhost", {});

    let resultElem = $(".silence-post-result").html().trim();
    expect(resultElem).toMatchSnapshot();

    ajaxServer.stop();
});

test("failed sendSilencePOST()", () => {
    var body = templatesMock.loadTemplates();
    body.push(
        "<span class='silence-post-result' " +
        "      data-uri='http://localhost'>" +
        "</span>"
    );
    document.body.innerHTML = body;

    const templates = require("./templates");
    templates.init();

    const ajaxServer = ajaxMock.createServer(500, {
        "status": "success",
        "errorType": "server_error",
        "error": "request failed"
    });
    ajaxServer.start();

    const silence = require("./silence");
    silence.sendSilencePOST("http://localhost", {});

    let resultElem = $(".silence-post-result").html().trim();
    expect(resultElem).toMatchSnapshot();

    ajaxServer.stop();
});

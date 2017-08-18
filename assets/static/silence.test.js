const $ = window.jQuery = require("jquery");
const moment = require("moment");
const templatesMock = require("./__mocks__/templatesMock");
const ajaxMock = require("./__mocks__/ajaxMock");

jest.useFakeTimers();

test("silence form", () => {
    let body = templatesMock.loadTemplates();
    body.push(
        "<div class='modal' id='silenceModal' role='dialog'>" +
        "  <div class='modal-dialog' role='document'>" +
        "    <div class='modal-content'>" +
        "      <div class='modal-body'></div>" +
        "    </div>" +
        "  </div>" +
        "</div>" +
        "<span type='button' id='silenceButton'" +
        "      data-labels='@state=active,foo=bar'" +
        "      data-alertmanagers='mock'" +
        "      data-alertname='fakeAlert'" +
        "      data-toggle='modal'" +
        "      data-target='#silenceModal'>" +
        "</span>"
    );
    document.body.innerHTML = body;

    const templates = require("./templates");
    templates.init();

    const config = require("./config");
    config.init({
        CopySelector: "#copy-settings-with-filter",
        SaveSelector: "#save-default-filter",
        ResetSelector: "#reset-settings"
    });

    const silence = require("./silence");
    silence.setupSilenceForm();

    require("bootstrap/js/tooltip.js");
    require("bootstrap/js/modal.js");

    // rendering silence form requires AJAX call to pull data
    // first check failed request
    let ajaxServer = ajaxMock.createServer(500, {
        "status": "error",
        "errorType": "server_error",
        "error": "request failed"
    });
    ajaxServer.start();
    // click on the button, modal should show and render via ajax call
    $("#silenceButton").click();
    jest.runOnlyPendingTimers();
    let silenceModal = $("#silenceModal").html().trim();
    expect(silenceModal).toMatchSnapshot();
    ajaxServer.stop();

    // hide the form
    $("#silenceModal").modal("hide");

    // next try successful request
    ajaxServer = ajaxMock.createServer(200, {
        "groups": [ {
            "receiver": "default",
            "labels": {"alertname": "fakeAlert"},
            "alerts": [ {
                "annotations": {},
                "labels": {
                    "alertname": "fakeAlert",
                    "cluster": "prod",
                    "foo": "bar"
                },
                "startsAt": "2017-07-22T01:07:54.32189391Z",
                "endsAt": "0001-01-01T00:00:00Z",
                "state": "active",
                "alertmanager": [ {
                    "name": "mock",
                    "uri": "http://localhost",
                    "state": "active",
                    "startsAt": "2017-07-22T01:07:54.32189391Z",
                    "endsAt": "0001-01-01T00:00:00Z",
                    "source": "localhost/prometheus",
                    "silences": {}
                } ],
                "receiver": "default",
                "links": {}
            } ],
            "id": "12345",
            "hash": "abcdef",
            "stateCount": {"active": 1, "suppressed": 0, "unprocessed": 0}
        } ]
    });
    ajaxServer.start();
    // click on the button, modal should show and render via ajax call
    $("#silenceButton").click();
    jest.runOnlyPendingTimers();
    // default times are relative to current time, use fixed values
    let startsAt = moment("2050-01-01T01:00:00.000Z").utc();
    let endsAt = moment("2050-01-01T02:00:00.000Z").utc();
    $("#endsAt").data("DateTimePicker").date(endsAt);
    $("#startsAt").data("DateTimePicker").date(startsAt);
    // compare html to a snapshot
    silenceModal = $("#silenceModal").html().trim();
    expect(silenceModal).toMatchSnapshot();
    ajaxServer.stop();

    // submit silence
    ajaxServer = ajaxMock.createServer(200, {
        "status": "success",
        "data": {"silenceId": "abcdef"}
    });
    ajaxServer.start();
    $("#newSilenceForm").submit();
    ajaxServer.stop();
    silenceModal = $("#silenceModal").html().trim();
    expect(silenceModal).toMatchSnapshot();
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
        "status": "error",
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

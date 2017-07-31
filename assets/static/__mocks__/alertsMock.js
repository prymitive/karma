const fs = require("fs");
const path = require("path");
const mockXHR = require("mock-xhr");

function getAlertsJSON() {
    const alertsPath = path.join(__dirname, "../../../.tests/alerts.json");
    if (fs.existsSync(alertsPath)) {
        return fs.readFileSync(alertsPath, {encoding: "utf-8"});
    }
    return "";
}

function mockAlertsJSONserver() {
    var alertsData = getAlertsJSON();
    if (alertsData === "") {
        // we don't have alerts data, return false
        return false;
    }
    var server = new mockXHR.server();
    server.handle = function (request) {
        request.setResponseHeader("Content-Type", "application/json");
        request.receive(200, alertsData);
    };
    return server;
}

exports.mockAlertsJSON = mockAlertsJSONserver;

const mockXHR = require("mock-xhr");

function ajaxSuccessMockServer() {
    var server = new mockXHR.server();
    server.handle = function (request) {
        request.setResponseHeader("Content-Type", "application/json");
        request.receive(200, JSON.stringify({"status":"success"}));
    };
    return server;
}

exports.ajaxSuccessMockServer = ajaxSuccessMockServer;

const mockXHR = require("mock-xhr");

function createServer(status, payload) {
    var server = new mockXHR.server();
    server.handle = function (request) {
        request.setResponseHeader("Content-Type", "application/json");
        request.receive(status, JSON.stringify(payload));
    };
    return server;
}

exports.createServer = createServer;

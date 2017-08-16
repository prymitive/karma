const mockXHR = require("mock-xhr");

function ajaxErrorMockServer() {
    var server = new mockXHR.server();
    server.handle = function (request) {
        request.setResponseHeader("Content-Type", "application/json");
        request.receive(500, JSON.stringify({
            "status": "error",
            "errorType": "server_error",
            "error": "end time must not be modified for elapsed silence"
        }));
    };
    return server;
}

exports.ajaxErrorMockServer = ajaxErrorMockServer;

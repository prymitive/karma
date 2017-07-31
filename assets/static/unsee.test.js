const $ = require("jquery");
const templatesMock = require("./__mocks__/templatesMock");
const alertsMock = require("./__mocks__/alertsMock");

jest.useFakeTimers();

test("unsee getRefreshRate()", () => {
    window.jQuery = require("jquery");
    const unsee = require("./unsee");
    unsee.getRefreshRate();
});

// this runs only if we have test alerts.json response which is generated
// when running view_test.go
const alertsServer = alertsMock.mockAlertsJSON();
if (alertsServer) {
    test("unsee main entrypoint", () => {
        // load template files and setup required elements
        var body = templatesMock.loadTemplates();
        // counter in the navbar
        body.push(
            "<div class='navbar-header'>" +
            "  <a class='navbar-brand text-center'>" +
            "    <strong id='alert-count'>0</strong>" +
            "    <div id='spinner'>" +
            "    </div>" +
            "    </a>" +
            "</div>"
        );
        // filter input
        body.push("<input id='filter' value='' data-default-used='' data-default-filter=''>");
        // alerts placeholder
        body.push(
            "<div id='alerts' data-static-color-labels=''>" +
            "  <div class='grid-sizer'></div>" +
            "</div>"
        );
        // error placeholders
        body.push(
            "<div id='raven-error'></div>" +
            "<div id='instance-errors'></div>" +
            "<div id='errors'></div>"
        );
        document.body.innerHTML = body.join("\n");

        const unsee = require("./unsee");
        const grid = require("./grid");
        require("bootstrap/js/tooltip.js");
        require("bootstrap/js/modal.js");
        require("bootstrap/js/popover.js");
        alertsServer.start();

        unsee.onReady();
        unsee.triggerReload();
        jest.runOnlyPendingTimers();
        // we should have 2 alerts
        expect(grid.items().length).toBe(2);
        expect($("#alert-count").text()).toBe("2");

        unsee.triggerReload();
        jest.runOnlyPendingTimers();
        // we should still have 2 alerts
        expect(grid.items().length).toBe(2);
        expect($("#alert-count").text()).toBe("2");

        // clear grid and update again
        grid.clear();
        unsee.triggerReload();
        jest.runOnlyPendingTimers();
        // we should still have 2 alerts
        expect(grid.items().length).toBe(2);
        expect($("#alert-count").text()).toBe("2");

        alertsServer.stop();
    });
}

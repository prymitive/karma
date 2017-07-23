test("alerts getLabelAttrs()", () => {
    window.jQuery = require("jquery");
    const alerts = require("./alerts");
    expect(alerts.getLabelAttrs("foo", "bar")).toEqual({
        "class": "label label-list label-warning",
        "style": "",
        "text": "foo: bar"
    });
    expect(alerts.getLabelAttrs("@state", "active")).toEqual({
        "class": "label label-list label-danger",
        "style": "",
        "text": "@state: active"
    });
    expect(alerts.getLabelAttrs("@state", "suppressed")).toEqual({
        "class": "label label-list label-success",
        "style": "",
        "text": "@state: suppressed"
    });
    expect(alerts.getLabelAttrs("@state", "unprocessed")).toEqual({
        "class": "label label-list label-default",
        "style": "",
        "text": "@state: unprocessed"
    });
});

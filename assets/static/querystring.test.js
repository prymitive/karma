const querystring = require("./querystring");

test("querystring parse()", () => {
    expect(querystring.parse()).toEqual({});
    Object.defineProperty(document, "URL", {
        value: "http://example.com?foo=bar",
        configurable: true,
    });
    expect(querystring.parse()).toEqual({"foo": "bar"});
});

test("querystring update()", () => {
    Object.defineProperty(document, "URL", {
        value: "http://example.com?foo=bar",
        configurable: true,
    });
    expect(querystring.parse()).toEqual({"foo": "bar"});
    /*
    FIXME disabled as it requires mocking browser history
    querystring.update("foo", "notbar");
    expect(querystring.parse()).toEqual({"foo": "notbar"});
    */
});

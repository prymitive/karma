const Bloodhound = require("corejs-typeahead/dist/bloodhound");
const autocomplete = require("./autocomplete");

test("autocomplete init()", () => {
    autocomplete.init();
});

test("autocomplete getAutocomplete()", () => {
    expect(autocomplete.getAutocomplete()).toBeInstanceOf(Bloodhound);
});

test("autocomplete reset()", () => {
    autocomplete.reset();
});

test("autocomplete generateHints(@state, ...)", () => {
    [ "active", "suppressed", "unprocessed" ].forEach(function (state) {
        expect(
            JSON.stringify(autocomplete.generateHints("@state", state))
        ).toBe(JSON.stringify([
            "@state=active",
            "@state=suppressed",
            "@state=unprocessed",
            "@state!=active",
            "@state!=suppressed",
            "@state!=unprocessed"
        ]));
    });
});

test("autocomplete generateHints(foo, bar)", () => {
    expect(
        JSON.stringify(autocomplete.generateHints("foo", "bar"))
    ).toBe(
        JSON.stringify([ "foo=bar", "foo!=bar" ])
    );
});

test("autocomplete generateHints(foo, bar with spaces)", () => {
    expect(
        JSON.stringify(autocomplete.generateHints("foo", "bar with spaces"))
    ).toBe(
        JSON.stringify([
            "foo=bar with spaces",
            "foo!=bar with spaces",
            "foo=~bar",
            "foo!~bar",
            "foo=~with",
            "foo!~with",
            "foo=~spaces",
            "foo!~spaces"
        ])
    );
});

test("autocomplete generateHints(number, 1)", () => {
    expect(
        JSON.stringify(autocomplete.generateHints("number", "1"))
    ).toBe(
        JSON.stringify([ "number=1", "number!=1", "number>1", "number<1" ])
    );
});

const colors = require("./colors");

test("colors init([])", () => {
    colors.init([]);
    expect(colors.getStaticLabels()).toHaveLength(0);
});

test("colors init([foo, bar])", () => {
    colors.init([ "foo", "bar" ]);
    expect(colors.getStaticLabels()).toHaveLength(2);
});

test("colors isStaticLabel()", () => {
    colors.init([]);
    expect(colors.isStaticLabel("foo")).toBe(false);
    expect(colors.isStaticLabel("bar")).toBe(false);
    expect(colors.isStaticLabel("foobar")).toBe(false);
    colors.init([ "foo", "bar" ]);
    expect(colors.isStaticLabel("foo")).toBe(true);
    expect(colors.isStaticLabel("bar")).toBe(true);
    expect(colors.isStaticLabel("foobar")).toBe(false);
});

test("colors getClass()", () => {
    colors.init([ "foo" ]);
    // hardcoded value
    expect(colors.getClass("alertname", "foo")).toBe("label-primary");
    // special case
    expect(colors.getClass("@state", "unprocessed")).toBe("label-default");
    expect(colors.getClass("@state", "active")).toBe("label-danger");
    expect(colors.getClass("@state", "suppressed")).toBe("label-success");
    // static label passed via init()
    expect(colors.getClass("foo", "bar")).toBe("label-info");
    // anything else
    expect(colors.getClass("bar", "foo")).toBe("label-warning");
    expect(colors.getClass("key", "val")).toBe("label-warning");
    expect(colors.getClass("", "")).toBe("label-warning");
});

test("colors getStyle()", () => {
    colors.init([]);
    expect(colors.getStyle("foo", "bar")).toEqual("");
    var c = {
        "foo": {
            "bar": {
                "background": {
                    "red": 0,
                    "green": 1,
                    "blue": 2,
                    "alpha": 255
                },
                "font": {
                    "red": 3,
                    "green": 4,
                    "blue": 5,
                    "alpha": 128
                }
            }
        }
    }
    colors.update(c);
    expect(colors.getStyle("foo", "bar")).toEqual(
        "background-color: rgba(0, 1, 2, 255); color: rgba(3, 4, 5, 128); "
    );
});

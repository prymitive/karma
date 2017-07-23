const Option = require("./option");

test("new Option()", () => {
    var opt = new Option({
        Cookie: "myCookie",
        QueryParam: "myQuery",
        Selector: "#toggle"
    });
    expect(opt.Cookie).toBe("myCookie");
    expect(opt.QueryParam).toBe("myQuery");
    expect(opt.Selector).toBe("#toggle")
});

const templates = require("./templates");
const templatesMock = require("./__mocks__/templatesMock");
require("javascript-linkify");

test("templates init()", () => {
    document.body.innerHTML = templatesMock.loadTemplates();
    templates.init();
});

test("linkify simple link", () => {
    expect(window.linkify("http://localhost")).toMatchSnapshot();
    expect(window.linkify("http://localhost:8080/abc")).toMatchSnapshot();
    expect(window.linkify("http://localhost:8080/abc#foo")).toMatchSnapshot();
    expect(window.linkify("http://localhost:8080/abc?foo")).toMatchSnapshot();
});

test("linkify kibana link", () => {
    let longLink =
        "https://kibana/app/kibana#/dashboard/dashboard_name?_g=" +
        "(time:(from:now-1h,mode:quick,to:now))&_a=(filters:!((query:" +
        "(match:(host:(query:hostname,type:phrase))),meta:" +
        "(alias:!n,disabled:!f,index:'logstash-*',key:host,negate:!f," +
        "value:hostname)),(meta:(alias:!n,disabled:!f,index:'logstash-*'" +
        ",key:program,negate:!f,value:puppet-agent),query:(match:(program:" +
        "(query:puppet-agent,type:phrase)))),(meta:(alias:!n,disabled:" +
        "!f,index:'logstash-*',key:level,negate:!f,value:ERROR),query:" +
        "(match:(level:(query:ERROR,type:phrase))))))";
    expect(window.linkify(longLink)).toMatchSnapshot();
    expect(window.linkify("foo " + longLink + " bar")).toMatchSnapshot();
});

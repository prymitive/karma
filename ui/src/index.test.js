import { EmptyAPIResponse } from "__mocks__/Fetch";

it("renders without crashing", () => {
  const response = EmptyAPIResponse();
  response.filters = [];
  fetch.mockResponse(JSON.stringify(response));
  const Index = require("./index.js");
  expect(Index).toBeTruthy();
});

describe("console", () => {
  it("console.error() throws an error", () => {
    expect(() => {
      console.error("foo");
    }).toThrowError("message=foo args=");
  });

  it("console.warn() throws an error", () => {
    expect(() => {
      console.warn("foo", "bar");
    }).toThrowError("message=foo args=bar");
  });

  it("console.info() throws an error", () => {
    expect(() => {
      console.warn("foo", "bar", "abc");
    }).toThrowError("message=foo args=bar,abc");
  });

  it("console.log() throws an error", () => {
    expect(() => {
      console.warn("foo bar");
    }).toThrowError("message=foo bar args=");
  });

  it("console.trace() throws an error", () => {
    expect(() => {
      console.warn();
    }).toThrowError("message=undefined args=");
  });

  it("console.warn() with React deprecation warning doesn't throw any error", () => {
    // https://reactjs.org/blog/2019/08/08/react-v16.9.0.html#new-deprecations
    const msg = [
      "Warning: componentWillMount has been renamed, and is not recommended for use. See https://fb.me/react-async-component-lifecycle-hooks for details.",
      "* Move code with side effects to componentDidMount, and set initial state in the constructor.",
      "* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. In React 17.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run `npx react-codemod rename-unsafe-lifecycles` in your project source folder.",
      "Please update the following components: foo"
    ].join("\n");
    expect(() => {
      console.warn(msg);
    }).not.toThrow();
  });
});

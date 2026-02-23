import { TestEnvironment } from "jest-environment-jsdom";

export default class CustomTestEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.ReadableStream = ReadableStream;
    this.global.fetch = fetch;
  }
}

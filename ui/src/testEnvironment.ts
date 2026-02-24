import { TestEnvironment } from "jest-environment-jsdom";

// ResizeObserver polyfill class for react-cool-dimensions
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

export default class CustomTestEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.ReadableStream = ReadableStream;
    this.global.fetch = fetch;
    // Polyfill ResizeObserver for react-cool-dimensions (checks window.ResizeObserver)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.global as any).ResizeObserver = ResizeObserverPolyfill;
    // Also set on window for libraries that check window.ResizeObserver
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.global as any).window.ResizeObserver = ResizeObserverPolyfill;
  }
}

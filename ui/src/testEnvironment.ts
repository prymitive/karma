import { TestEnvironment } from "jest-environment-jsdom";

// jsdom has no ResizeObserver implementation
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

interface GlobalWithResizeObserver {
  ResizeObserver: typeof ResizeObserverPolyfill;
  window: { ResizeObserver: typeof ResizeObserverPolyfill };
}

export default class CustomTestEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.ReadableStream = ReadableStream;
    this.global.fetch = fetch;
    const g = this.global as unknown as GlobalWithResizeObserver;
    g.ResizeObserver = ResizeObserverPolyfill;
    g.window.ResizeObserver = ResizeObserverPolyfill;
  }
}

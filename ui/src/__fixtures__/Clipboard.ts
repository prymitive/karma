// jsdom lacks navigator.clipboard and window.isSecureContext,
// mock both so copy-to-clipboard uses the async clipboard API path.
const mockClipboard = (): jest.Mock => {
  const writeText = jest.fn(() => Promise.resolve());

  Object.defineProperty(window, "isSecureContext", {
    value: true,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    writable: true,
    configurable: true,
  });

  return writeText;
};

export { mockClipboard };

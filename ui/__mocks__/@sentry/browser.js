const init = jest.fn();
const MockScope = {
  setExtra: jest.fn()
};
const configureScope = jest.fn().mockImplementation(fn => {
  fn(MockScope);
});
const captureException = jest.fn();

export { init, configureScope, captureException, MockScope };

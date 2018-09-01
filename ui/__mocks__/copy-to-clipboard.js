// mock copy-to-clipboard since it throws errors in tests
// and we don't really need to copy anything, only ensure we're calling it

const copy = jest.fn();

export default copy;

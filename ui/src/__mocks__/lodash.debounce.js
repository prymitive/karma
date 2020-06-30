export default function (wrapped) {
  wrapped.cancel = jest.fn();
  return wrapped;
}

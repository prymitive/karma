export default function (wrapped: any) {
  wrapped.cancel = jest.fn();
  return wrapped;
}

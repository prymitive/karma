export default function debounce(wrapped: any) {
  wrapped.cancel = jest.fn();
  return wrapped;
}

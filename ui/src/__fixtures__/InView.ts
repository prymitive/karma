import type { InViewHookResponse } from "react-intersection-observer";

const mockInViewResponse = (inView: boolean): InViewHookResponse => {
  const ref = jest.fn() as (node?: Element | null) => void;
  const response = Object.assign([ref, inView, undefined] as const, {
    ref,
    inView,
    entry: undefined,
  });
  return response as unknown as InViewHookResponse;
};

export { mockInViewResponse };

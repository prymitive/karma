import { useRef } from "react";

const mock = {
  value: true,
};

const useInView = () => {
  const ref = useRef(null);
  return [ref, mock.value];
};
useInView.setInView = (val) => {
  mock.value = val;
};

export { useInView };

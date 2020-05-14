// https://github.com/FezVrasta/popper.js/issues/478#issuecomment-341506071

export default class Popper {
  constructor() {
    return {
      destroy: () => {},
      scheduleUpdate: () => {},
    };
  }
}

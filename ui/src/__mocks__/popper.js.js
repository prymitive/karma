// https://github.com/FezVrasta/popper.js/issues/478#issuecomment-341506071

import PopperJs from "popper.js";

export default class Popper {
  static placements = PopperJs.placements;

  constructor() {
    return {
      destroy: () => {},
      scheduleUpdate: () => {}
    };
  }
}

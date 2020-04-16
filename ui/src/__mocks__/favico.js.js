export default class Favico {
  static badge = jest.fn();

  constructor() {
    return {
      badge: Favico.badge,
    };
  }
}

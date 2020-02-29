const PressKey = (tree, key, code) => {
  tree.simulate("keyDown", { key: key, keyCode: code, which: code });
  tree.simulate("keyUp", { key: key, keyCode: code, which: code });
};

export { PressKey };

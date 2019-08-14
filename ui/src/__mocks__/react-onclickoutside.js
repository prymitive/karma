// mock react-onclickoutside so we bypass it due to:
// TypeError: Cannot read property 'isReactComponent' of undefined

export default function onClickOutsideHOC(WrappedComponent, config) {
  return WrappedComponent;
}

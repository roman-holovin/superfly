import { PURE_NODE } from './constants';

import { createVNode } from './h';

export default function withPureFactory(comparePredicate = () => true) {
  return function(WrappedComponent) {
    return function pure(props) {
      return createVNode(WrappedComponent, props, props.children, PURE_NODE, {
        comparePredicate,
      });
    };
  };
}

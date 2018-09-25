import { STATEFUL_NODE } from './constants';

import { createVNode } from './h';

export default function withStateFactory(
  initialStateFactory = {},
  handlers = {},
) {
  return function(WrappedComponent) {
    return function(props) {
      return createVNode(
        WrappedComponent,
        props,
        props.children,
        STATEFUL_NODE,
        {
          initialStateFactory,
          handlers,
        },
      );
    };
  };
}

import { merge } from './utils';

import {
  DEFAULT_NODE,
  COMPONENT_NODE,
  EMPTY_ARRAY,
  TEXT_NODE,
  lifecycleHooks,
} from './constants';

export function createVNode(nodeName, attrs, children, type, options) {
  const lifecycle = {};
  if (attrs) {
    for (let i in lifecycleHooks) {
      const lifecycleHook = lifecycleHooks[i];
      if (attrs[lifecycleHook]) {
        lifecycle[lifecycleHook] = attrs[lifecycleHook];
        delete attrs[lifecycleHook];
      }
    }
  }

  return merge(
    {
      nodeName,
      attrs: merge({ children }, attrs),
      type,
      lifecycle,
    },
    options,
  );
}

export function h(nodeName, attrs, ...rest) {
  const type = typeof nodeName === 'function' ? COMPONENT_NODE : DEFAULT_NODE;

  const children = Array.prototype
    .concat(...rest)
    .map(
      c =>
        typeof c === 'string' || typeof c === 'number'
          ? createVNode(TEXT_NODE, { nodeValue: c }, EMPTY_ARRAY, TEXT_NODE)
          : c,
    );

  return createVNode(nodeName, attrs, children, type);
}

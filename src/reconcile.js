import { merge } from './utils';

import {
  COMPONENT_NODE,
  PURE_NODE,
  STATEFUL_NODE,
  LIFECYCLE,
  ADD_NODE,
  ADD_ATTR,
  UPDATE_ATTR,
  REMOVE_ATTR,
  REMOVE_NODE,
} from './constants';

export function reconcileAttrs(prevNode, nextNode, id) {
  const patches = [];

  for (let key in prevNode.attrs) {
    if (key !== 'children') {
      const prevValue = prevNode.attrs[key];
      const nextValue = nextNode.attrs[key];

      if (prevValue && nextValue && prevValue !== nextValue) {
        patches.push({
          type: UPDATE_ATTR,
          prevNode,
          nextNode,
          key,
          value: nextValue,
          id,
        });
      } else if (prevValue && nextValue == null) {
        patches.push({ type: REMOVE_ATTR, prevNode, nextNode, key, id });
      }
    }
  }

  for (let key in nextNode.attrs) {
    if (key !== 'children') {
      const prevValue = prevNode.attrs[key];
      const nextValue = nextNode.attrs[key];

      if (prevValue == null && nextValue) {
        patches.push({
          type: ADD_ATTR,
          prevNode,
          nextNode,
          key,
          value: nextValue,
          id,
        });
      }
    }
  }

  if (patches.length > 0) {
    if (nextNode.lifecycle.beforeupdate) {
      patches.unshift({
        type: LIFECYCLE,
        hook: 'beforeupdate',
        prevNode,
        nextNode,
        id,
      });
    }
    if (nextNode.lifecycle.updated) {
      patches.push({
        type: LIFECYCLE,
        hook: 'updated',
        prevNode,
        nextNode,
        id,
      });
    }
  }

  return patches;
}

export function reconciler(render) {
  const instances = {};

  return function reconcile(prevNode, nextNode, id = '0') {
    let patches = [];

    if (!prevNode && nextNode) {
      if (nextNode.type === COMPONENT_NODE || nextNode.type === STATEFUL_NODE) {
        if (nextNode.lifecycle.beforecreate) {
          patches.push({
            type: LIFECYCLE,
            hook: 'beforecreate',
            node: nextNode,
            id,
          });
        }
        if (nextNode.lifecycle.created) {
          patches.push({
            type: LIFECYCLE,
            hook: 'created',
            node: nextNode,
            id,
          });
        }

        const initialState =
          typeof nextNode.initialStateFactory === 'function'
            ? nextNode.initialStateFactory(nextNode.attrs)
            : nextNode.initialStateFactory;
        nextNode.state = initialState;

        let prev = nextNode;
        for (let i in nextNode.handlers) {
          let next = nextNode;
          const handler = nextNode.handlers[i];

          nextNode.handlers[i] = function(...args) {
            next = merge({}, prev);
            const nextState = handler(next.state, next.attrs)(...args);
            next.state = merge(next.state, nextState);

            prev = render(prev, next, id);
          };
        }

        nextNode = nextNode.nodeName(
          merge({}, nextNode.attrs, nextNode.state, nextNode.handlers),
        );

        instances[id] = nextNode;

        const matroskaPatches = reconcile(null, nextNode, id);
        Array.prototype.push.apply(patches, matroskaPatches);
      } else {
        if (nextNode.lifecycle.beforecreate) {
          patches.push({
            type: LIFECYCLE,
            hook: 'beforecreate',
            node: nextNode,
            id,
          });
        }
        patches.push({ type: ADD_NODE, node: nextNode, id });

        for (let index in nextNode.attrs.children) {
          const child = nextNode.attrs.children[index];
          const childPatches = reconcile(null, child, `${id}.${index}`);
          Array.prototype.push.apply(patches, childPatches);
        }
        if (nextNode.lifecycle.created) {
          patches.push({
            type: LIFECYCLE,
            hook: 'created',
            node: nextNode,
            id,
          });
        }
      }
    } else if (prevNode && nextNode) {
      if (prevNode.nodeName === nextNode.nodeName) {
        if (
          (prevNode.type === COMPONENT_NODE &&
            nextNode.type === COMPONENT_NODE) ||
          (prevNode.type === PURE_NODE &&
            nextNode.type === PURE_NODE &&
            !nextNode.comparePredicate(prevNode.attrs, nextNode.attrs))
        ) {
          const component = nextNode;
          nextNode = nextNode.nodeName(nextNode.attrs);
          prevNode = instances[id];

          const componentPatches = reconcile(prevNode, nextNode, id);
          if (componentPatches.length > 0) {
            if (component.lifecycle.beforeupdate) {
              patches.unshift({
                type: LIFECYCLE,
                hook: 'beforeupdate',
                node: component,
                id,
              });
            }
            if (component.lifecycle.updated) {
              patches.push({
                type: LIFECYCLE,
                hook: 'updated',
                node: component,
                id,
              });
            }
          }

          Array.prototype.push.apply(patches, componentPatches);
        } else if (
          prevNode.type === STATEFUL_NODE &&
          nextNode.type === STATEFUL_NODE
        ) {
          nextNode = nextNode.nodeName(
            merge({}, nextNode.attrs, nextNode.state, nextNode.handlers),
          );
          prevNode = instances[id];

          const stateComponentPatches = reconcile(prevNode, nextNode, id);
          Array.prototype.push.apply(patches, stateComponentPatches);
        } else if (nextNode.type !== PURE_NODE) {
          const attrPatches = reconcileAttrs(prevNode, nextNode, id);
          Array.prototype.push.apply(patches, attrPatches);

          const maxIndex = Math.max(
            nextNode.attrs.children.length,
            prevNode.attrs.children.length,
          );
          const childrenPatches = [];
          for (let i = 0; i < maxIndex; i += 1) {
            const childPatches = reconcile(
              prevNode.attrs.children[i],
              nextNode.attrs.children[i],
              `${id}.${i}`,
            );
            Array.prototype.push.apply(childrenPatches, childPatches);
          }
          if (childrenPatches.length > 0 && nextNode.lifecycle.beforeupdate) {
            childrenPatches.unshift({
              type: LIFECYCLE,
              hook: 'beforeupdate',
              prevNode,
              nextNode,
              id,
            });
          }
          Array.prototype.push.apply(patches, childrenPatches);
          if (childrenPatches.length > 0 && nextNode.lifecycle.updated) {
            childrenPatches.push({
              type: LIFECYCLE,
              hook: 'updated',
              prevNode,
              nextNode,
              id,
            });
          }
        }
      } else {
        const removePatches = reconcile(prevNode, null, id);
        Array.prototype.push.apply(patches, removePatches);
        const addPatches = reconcile(null, nextNode, id);
        Array.prototype.push.apply(patches, addPatches);
      }
    } else if (prevNode && !nextNode) {
      if (prevNode.type === COMPONENT_NODE || prevNode.type === STATEFUL_NODE) {
        prevNode = instances[id];

        const matroskaPatches = reconcile(prevNode, null, id);
        Array.prototype.push.apply(patches, matroskaPatches);

        delete instances[id];
      } else {
        if (prevNode.lifecycle.beforedestroy) {
          patches.push({
            type: LIFECYCLE,
            hook: 'beforedestroy',
            node: prevNode,
            id,
          });
        }

        const childrenPatches = [];
        for (let i = 0; i < prevNode.attrs.children.length; i += 1) {
          const childPatches = reconcile(
            prevNode.attrs.children[i],
            null,
            `${id}.${i}`,
          );
          Array.prototype.push.apply(childrenPatches, childPatches);
        }
        if (childrenPatches.length > 0 && prevNode.lifecycle.beforeupdate) {
          childrenPatches.unshift({
            type: LIFECYCLE,
            hook: 'beforedestroy',
            node: prevNode,
            id,
          });
        }
        Array.prototype.push.apply(patches, childrenPatches);
        if (childrenPatches.length > 0 && prevNode.lifecycle.updated) {
          childrenPatches.push({
            type: LIFECYCLE,
            hook: 'destroyed',
            node: prevNode,
            id,
          });
        }
        patches.push({ type: REMOVE_NODE, node: prevNode, id });
        if (prevNode.lifecycle.destroyed) {
          patches.push({
            type: LIFECYCLE,
            hook: 'destroyed',
            node: prevNode,
            id,
          });
        }
      }
    }

    return patches;
  };
}

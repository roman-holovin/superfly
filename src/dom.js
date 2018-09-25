import {
  LIFECYCLE,
  ADD_NODE,
  ADD_ATTR,
  UPDATE_ATTR,
  REMOVE_ATTR,
  REMOVE_NODE,
  TEXT_NODE,
} from './constants';

import { reconciler } from './reconcile';

const elements = {};
const events = {};

function getParentId(id) {
  return id.substring(0, id.lastIndexOf('.'));
}

function getCurrentIndex(id) {
  return +id.substring(id.lastIndexOf('.') + 1);
}

function lifecycle(patch) {
  const $element = elements[patch.id];

  if (patch.hook === 'beforeupdate' || patch.hook === 'updated') {
    patch.nextNode.lifecycle[patch.hook](
      $element,
      patch.prevNode.attrs,
      patch.nextNode.attrs,
    );
  } else {
    // TODO: look into absence of the $element in `beforecreate` hook
    patch.node.lifecycle[patch.hook]($element, patch.node.attrs);
  }
}

function createElement(vnode) {
  const $element =
    vnode.type === TEXT_NODE
      ? document.createTextNode('')
      : document.createElement(vnode.nodeName);

  for (let key in vnode.attrs) {
    if (key !== 'children') {
      $element[key] = vnode.attrs[key];
    }
  }

  return $element;
}

function addNode({ node, id }) {
  const $element = createElement(node);
  elements[id] = $element;
  const parentId = getParentId(id);
  const $parent = elements[parentId];
  const nextSiblingId = `${parentId}.${getCurrentIndex(id) + 1}`;
  const $nextSibling = elements[nextSiblingId];

  $parent.insertBefore($element, $nextSibling);
}

function setAttribute({ key, value, id }) {
  const $element = elements[id];

  // key.startsWith('on')
  if (key[0] === 'o' && key[1] === 'n') {
    const attachedEvents = events[id] || {};
    const type = key.slice(2);

    if (!attachedEvents[type]) {
      $element.addEventListener(type, value);
    }

    attachedEvents[type] = value;
    events[id] = attachedEvents;

    if (value == null || value === false) {
      $element.removeEventListener(type, attachedEvents[type]);
    }
  }

  // NOTE: shrotcut for value === null || value === undefined || value === false
  if (value == null || value === false) {
    $element.removeAttribute(key);
  } else {
    $element.setAttribute
      ? $element.setAttribute(key, value)
      : ($element[key] = value);
  }
}

function removeNode({ id }) {
  const $element = elements[id];
  delete elements[id];
  $element.remove();
}

const actions = {
  [LIFECYCLE]: lifecycle,
  [ADD_NODE]: addNode,
  [REMOVE_NODE]: removeNode,
  [ADD_ATTR]: setAttribute,
  [UPDATE_ATTR]: setAttribute,
  [REMOVE_ATTR]: setAttribute,
};

export function domRenderer($mountPoint) {
  elements[''] = $mountPoint;

  let prev = null;
  let scheduledRender = false;

  const reconcile = reconciler(render);
  function render(prevNode, nextNode, id) {
    const patches = reconcile(prevNode, nextNode, id);

    for (let index in patches) {
      const patch = patches[index];
      const type = patch.type;
      const apply = actions[type];

      apply(patch);
    }

    if (patches.length > 0) {
      return nextNode;
    }

    return prevNode;
  }

  return function(vnode) {
    if (!scheduledRender) {
      scheduledRender = true;
      window.requestAnimationFrame(() => {
        prev = render(prev, vnode, undefined);
        scheduledRender = false;
      });
    }
  };
}

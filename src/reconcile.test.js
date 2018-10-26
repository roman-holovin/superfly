import {
  TEXT_NODE,
  LIFECYCLE,
  ADD_NODE,
  ADD_ATTR,
  UPDATE_ATTR,
  REMOVE_ATTR,
  REMOVE_NODE,
} from './constants';
import { h } from './h';
import pure from './pure';
//import withState from './withState';

import { reconciler } from './reconcile';

const render = jest.fn((prev, next) => next);

describe('reconciler - vdom', () => {
  it('should produce patches for rendering from zero', () => {
    const reconcile = reconciler(render);
    const element = <main>Hello, world</main>;

    const patches = reconcile(null, element);

    expect(patches).toHaveLength(2);
    patches.map(p => p.type).forEach(t => {
      expect(t).toEqual(ADD_NODE);
    });
  });

  it('should remove old node and produce new one on node type mismatch', () => {
    const reconcile = reconciler(render);
    const prev = <div>Hello, world</div>;
    const next = <main>Hello, world</main>;

    const patches = reconcile(prev, next);

    expect(patches).toHaveLength(4);
    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: REMOVE_NODE,
        node: expect.objectContaining({
          type: TEXT_NODE,
        }),
      }),
    );

    expect(patches[1]).toEqual(
      expect.objectContaining({
        type: REMOVE_NODE,
        node: expect.objectContaining({
          nodeName: 'div',
        }),
      }),
    );

    expect(patches[2]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          nodeName: 'main',
        }),
      }),
    );
    expect(patches[3]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          type: TEXT_NODE,
        }),
      }),
    );
  });

  it('should remove node that is no longer present', () => {
    const reconcile = reconciler(render);
    const prev = (
      <ul>
        <li>Hello</li>
        <li>World</li>
      </ul>
    );

    const next = (
      <ul>
        <li>Hello</li>
      </ul>
    );

    const patches = reconcile(prev, next);

    expect(patches).toHaveLength(2);
    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: REMOVE_NODE,
        node: expect.objectContaining({
          type: TEXT_NODE,
        }),
      }),
    );
    expect(patches[1]).toEqual(
      expect.objectContaining({
        type: REMOVE_NODE,
        node: expect.objectContaining({
          nodeName: 'li',
        }),
      }),
    );
  });

  it('should add new node', () => {
    const reconcile = reconciler(render);
    const prev = (
      <ul>
        <li>Hello</li>
      </ul>
    );

    const next = (
      <ul>
        <li>Hello</li>
        <li>World</li>
      </ul>
    );

    const patches = reconcile(prev, next);

    expect(patches).toHaveLength(2);
    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          nodeName: 'li',
        }),
      }),
    );
    expect(patches[1]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          nodeName: TEXT_NODE,
          attrs: expect.objectContaining({
            nodeValue: 'World',
          }),
        }),
      }),
    );
  });

  it('should generate patch-list for node attributes', () => {
    const reconcile = reconciler(render);
    const prev = <div id="1" lang="en" />;
    const next = <div class="class" lang="pt" />;

    const patches = reconcile(prev, next);

    expect(patches).toHaveLength(3);
    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: REMOVE_ATTR,
        key: 'id',
      }),
    );
    expect(patches[1]).toEqual(
      expect.objectContaining({
        type: UPDATE_ATTR,
        key: 'lang',
        value: 'pt',
      }),
    );
    expect(patches[2]).toEqual(
      expect.objectContaining({
        type: ADD_ATTR,
        key: 'class',
        value: 'class',
      }),
    );
  });

  it('should handle updating text value for text node', () => {
    const reconcile = reconciler(render);
    const prev = <span>old value</span>;
    const next = <span>new value</span>;

    const patches = reconcile(prev, next);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: UPDATE_ATTR,
        key: 'nodeValue',
        value: 'new value',
      }),
    );
  });

  it('should handle adding components', () => {
    const reconcile = reconciler(render);
    function Component({ prop }) {
      return <span>{prop}</span>;
    }
    const element = <Component prop="1" />;

    const patches = reconcile(null, element);

    expect(patches).toHaveLength(2);
    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          nodeName: 'span',
        }),
      }),
    );
    expect(patches[1]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          nodeName: TEXT_NODE,
        }),
      }),
    );
  });

  it('should handle updating components', () => {
    const reconcile = reconciler(render);
    function Component({ prop }) {
      return <span>{prop}</span>;
    }
    const prev = <Component prop="1" />;
    const next = <Component prop="2" />;

    reconcile(null, prev);
    const patches = reconcile(prev, next);
    expect(patches).toHaveLength(1);

    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: UPDATE_ATTR,
        key: 'nodeValue',
        value: '2',
      }),
    );
  });

  it('should handle nested components', () => {
    const reconcile = reconciler(render);
    function AnotherComponent({ children }) {
      return <span>{children}</span>;
    }
    function Component({ prop }) {
      return <AnotherComponent>{prop}</AnotherComponent>;
    }

    const element = <Component prop={2} />;

    const patches = reconcile(null, element);
    expect(patches).toEqual([
      expect.objectContaining({
        node: expect.objectContaining({ nodeName: 'span' }),
      }),
      expect.objectContaining({
        node: expect.objectContaining({ nodeName: TEXT_NODE }),
      }),
    ]);
  });

  it('should handle conditional rendering', () => {
    const reconcile = reconciler(render);
    function Component({ isShown }) {
      return (
        <ul>
          <li>{isShown ? 'shown' : 'hidden'}</li>
          {!isShown && <li>Hello</li>}
          {isShown && <li>World</li>}
        </ul>
      );
    }
    const prev = <Component isShown={false} />;
    const next = <Component isShown />;

    reconcile(null, prev);
    const patches = reconcile(prev, next);

    expect(patches).toHaveLength(5);
    expect(patches[0]).toEqual(
      expect.objectContaining({
        type: UPDATE_ATTR,
        prevNode: expect.objectContaining({
          nodeName: TEXT_NODE,
          attrs: expect.objectContaining({
            nodeValue: 'hidden',
          }),
        }),
        nextNode: expect.objectContaining({
          nodeName: TEXT_NODE,
          attrs: expect.objectContaining({
            nodeValue: 'shown',
          }),
        }),
      }),
    );
    expect(patches[1]).toEqual(
      expect.objectContaining({
        type: REMOVE_NODE,
        node: expect.objectContaining({
          type: TEXT_NODE,
        }),
      }),
    );
    expect(patches[2]).toEqual(
      expect.objectContaining({
        type: REMOVE_NODE,
        node: expect.objectContaining({
          nodeName: 'li',
        }),
      }),
    );
    expect(patches[3]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          nodeName: 'li',
        }),
      }),
    );
    expect(patches[4]).toEqual(
      expect.objectContaining({
        type: ADD_NODE,
        node: expect.objectContaining({
          nodeName: TEXT_NODE,
        }),
      }),
    );
  });

  it('should handle pure components', () => {
    const reconcile = reconciler(render);
    const Component = jest.fn(({ a, b }) => {
      return (
        <span>
          {a}
          {b}
        </span>
      );
    });

    const comparator = jest.fn((prev, next) => prev.a === next.a);
    const PureComponent = pure(comparator)(Component);

    const prev = <PureComponent a={1} b={2} />;
    const next = <PureComponent a={1} b={3} />;

    reconcile(null, prev);
    const patches = reconcile(prev, next);
    expect(comparator).toReturnWith(true);
    expect(Component).not.toBeCalled();
    expect(patches).toHaveLength(0);
  });
});

describe('reconciler - lifecycle', () => {
  it('should produce lifecycle patches for node creation', () => {
    const reconcile = reconciler(render);
    const element = (
      <main beforecreate={jest.fn} created={jest.fn}>
        Hello, world
      </main>
    );

    const patches = reconcile(null, element);
    expect(patches).toEqual([
      expect.objectContaining({ type: LIFECYCLE, hook: 'beforecreate' }),
      expect.objectContaining({ type: ADD_NODE }),
      expect.objectContaining({ type: ADD_NODE }),
      expect.objectContaining({ type: LIFECYCLE, hook: 'created' }),
    ]);
  });

  it('should produce lifecycle patches for node update', () => {
    const reconcile = reconciler(render);
    const prev = <div class="class" beforeupdate={jest.fn} updated={jest.fn} />;
    const next = <div id="id" beforeupdate={jest.fn} updated={jest.fn} />;

    const patches = reconcile(prev, next);
    expect(patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: LIFECYCLE, hook: 'beforeupdate' }),
        expect.objectContaining({ type: LIFECYCLE, hook: 'updated' }),
      ]),
    );
  });

  it('should produce lifecycle patches for node removal', () => {
    const reconcile = reconciler(render);
    const component = (
      <div id="id" beforedestroy={jest.fn} destroyed={jest.fn} />
    );

    const patches = reconcile(component, null);
    expect(patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: LIFECYCLE, hook: 'beforedestroy' }),
        expect.objectContaining({ type: LIFECYCLE, hook: 'destroyed' }),
      ]),
    );
  });

  //it('should produce lifecycle patches for component removal', () => {
  //function Component() {
  //return 'Hi';
  //}
  //
  //const element = <Component beforedestroy={jest.fn} destroyed={jest.fn} />;
  //
  //const patches = reconcile(element, null);
  //});
});

describe('reconciler - stateful nodes', () => {
  //it('should produce lifecycle patches for node creation', () => {
  //const withComponentState = withState(
  //{ name: 'World' },
  //{ setName: () => name => ({ name }) },
  //);
  //
  //function Component({ name, setName }) {
  //setName('dlroW');
  //return <span>{name}</span>;
  //}
  //
  //const ComponentWithState = withComponentState(Component);
  //const element = <ComponentWithState />;
  //
  //const patches = reconcile(null, element);
  //expect(render).toBeCalled();
  //});
});

import { DEFAULT_NODE, TEXT_NODE, COMPONENT_NODE } from './constants';
import { h } from './h';

describe('h function', () => {
  it('should handle simple tags with attributes', () => {
    const element = <div id="id" class="class" />;

    expect(element).toEqual(
      expect.objectContaining({
        nodeName: 'div',
        type: DEFAULT_NODE,
        attrs: expect.objectContaining({
          id: 'id',
          class: 'class',
          children: expect.any(Array),
        }),
      }),
    );
  });

  it('should handle text nodes', () => {
    const element = <span>text</span>;

    expect(element).toEqual(
      expect.objectContaining({
        nodeName: 'span',
        attrs: expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              nodeName: TEXT_NODE,
              attrs: expect.objectContaining({ nodeValue: 'text' }),
              type: TEXT_NODE,
            }),
          ]),
        }),
        type: DEFAULT_NODE,
      }),
    );
  });

  it('should handle components', () => {
    function Component() {
      return null;
    }

    const element = <Component prop="prop" />;

    expect(element).toEqual(
      expect.objectContaining({
        nodeName: Component,
        attrs: expect.objectContaining({
          prop: 'prop',
          children: expect.any(Array),
        }),
        type: COMPONENT_NODE,
      }),
    );
  });

  it('should handle flatten children', () => {
    const items = [1, 2, 3];
    const element = (
      <ul>
        <li>Items:</li>
        {items.map(i => (
          <li>Item {i}</li>
        ))}
      </ul>
    );

    expect(element.attrs.children).toHaveLength(items.length + 1);
  });
});

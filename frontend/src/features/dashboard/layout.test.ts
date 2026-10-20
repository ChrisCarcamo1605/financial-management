import { describe, expect, it } from 'vitest';
import { moveItem, resolveLayout } from './layout';

const registry = [
  { id: 'a', defaultSize: 'full' as const, defaultVisible: true },
  { id: 'b', defaultSize: 'half' as const, defaultVisible: true },
  { id: 'c', defaultSize: 'half' as const, defaultVisible: false },
];

describe('resolveLayout', () => {
  it('uses defaults when nothing is saved', () => {
    expect(resolveLayout(null, registry)).toEqual([
      { id: 'a', visible: true, size: 'full' },
      { id: 'b', visible: true, size: 'half' },
      { id: 'c', visible: false, size: 'half' },
    ]);
  });
  it('keeps saved order, drops unknown/duplicate ids and appends new widgets', () => {
    const saved = [
      { id: 'b', visible: false, size: 'full' as const },
      { id: 'gone', visible: true, size: 'half' as const },
      { id: 'b', visible: true, size: 'half' as const },
      { id: 'a', visible: true, size: 'half' as const },
    ];
    expect(resolveLayout(saved, registry).map((w) => `${w.id}:${w.visible}:${w.size}`)).toEqual(['b:false:full', 'a:true:half', 'c:false:half']);
  });
});

describe('moveItem', () => {
  it('moves an element and ignores out-of-range moves', () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveItem([1, 2, 3], 0, 5)).toEqual([1, 2, 3]);
  });
});

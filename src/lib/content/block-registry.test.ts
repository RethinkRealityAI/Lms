import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('block registry', () => {
  it('registerBlockType adds a type to the registry', async () => {
    const { registerBlockType, getBlockType } = await import('./block-registry');
    registerBlockType({
      type: 'test_block',
      label: 'Test',
      description: 'A test block',
      icon: 'box',
      category: 'content',
      dataSchema: z.object({ text: z.string() }),
      defaultData: { text: '' },
      EditorComponent: null as any,
      ViewerComponent: null as any,
      version: 1,
    });
    const def = getBlockType('test_block');
    expect(def).toBeDefined();
    expect(def?.label).toBe('Test');
  });

  it('getBlockType returns undefined for unregistered type', async () => {
    const { getBlockType } = await import('./block-registry');
    expect(getBlockType('nonexistent')).toBeUndefined();
  });

  it('getAllBlockTypes returns all registered types', async () => {
    const { registerBlockType, getAllBlockTypes } = await import('./block-registry');
    const before = getAllBlockTypes().length;
    registerBlockType({
      type: 'another_test',
      label: 'Another',
      description: '',
      icon: 'box',
      category: 'media',
      dataSchema: z.object({}),
      defaultData: {},
      EditorComponent: null as any,
      ViewerComponent: null as any,
      version: 1,
    });
    expect(getAllBlockTypes().length).toBe(before + 1);
  });

  it('getBlockTypesByCategory filters correctly', async () => {
    const { getBlockTypesByCategory } = await import('./block-registry');
    const contentBlocks = getBlockTypesByCategory('content');
    expect(contentBlocks.every((b) => b.category === 'content')).toBe(true);
  });
});

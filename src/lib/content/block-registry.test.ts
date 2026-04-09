import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { registerBlockType, getBlockType, getAllBlockTypes, getBlockTypesByCategory, clearRegistry } from './block-registry';

describe('block registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registerBlockType adds a type to the registry', () => {
    registerBlockType({
      type: 'test_block',
      label: 'Test',
      description: 'A test block',
      icon: 'box',
      category: 'content',
      dataSchema: z.object({ text: z.string() }),
      defaultData: { text: '' },
      EditorComponent: null,
      ViewerComponent: null,
      version: 1,
    });
    const def = getBlockType('test_block');
    expect(def).toBeDefined();
    expect(def?.label).toBe('Test');
  });

  it('getBlockType returns undefined for unregistered type', () => {
    expect(getBlockType('nonexistent')).toBeUndefined();
  });

  it('getAllBlockTypes returns all registered types', () => {
    const before = getAllBlockTypes().length;
    registerBlockType({
      type: 'another_test',
      label: 'Another',
      description: '',
      icon: 'box',
      category: 'media',
      dataSchema: z.object({}),
      defaultData: {},
      EditorComponent: null,
      ViewerComponent: null,
      version: 1,
    });
    expect(getAllBlockTypes().length).toBe(before + 1);
  });

  it('getBlockTypesByCategory filters correctly', () => {
    registerBlockType({
      type: 'content_block',
      label: 'Content',
      description: '',
      icon: 'box',
      category: 'content',
      dataSchema: z.object({}),
      defaultData: {},
      EditorComponent: null,
      ViewerComponent: null,
      version: 1,
    });
    registerBlockType({
      type: 'media_block',
      label: 'Media',
      description: '',
      icon: 'image',
      category: 'media',
      dataSchema: z.object({}),
      defaultData: {},
      EditorComponent: null,
      ViewerComponent: null,
      version: 1,
    });
    const contentBlocks = getBlockTypesByCategory('content');
    expect(contentBlocks.length).toBeGreaterThan(0);
    expect(contentBlocks.every((b) => b.category === 'content')).toBe(true);
  });

  it('supports layout category for page_break blocks', () => {
    registerBlockType({
      type: 'page_break',
      label: 'Page Break',
      description: 'Split content into pages',
      icon: 'separator-horizontal',
      category: 'layout',
      dataSchema: z.object({}),
      defaultData: {},
      EditorComponent: null,
      ViewerComponent: null,
      version: 1,
    });
    const layoutBlocks = getBlockTypesByCategory('layout');
    expect(layoutBlocks).toHaveLength(1);
    expect(layoutBlocks[0].type).toBe('page_break');
  });
});

import type { ZodSchema } from 'zod';
import type React from 'react';

export type BlockCategory = 'content' | 'media' | 'interactive' | 'assessment' | 'navigation';

export interface BlockEditorProps<TData = Record<string, unknown>> {
  data: TData;
  block: { id: string; title?: string };
  onChange: (data: TData) => void;
}

export interface BlockViewerProps<TData = Record<string, unknown>> {
  data: TData;
  block: { id: string; title?: string; is_visible: boolean };
}

export interface BlockTypeDefinition<TData = Record<string, unknown>> {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: BlockCategory;
  dataSchema: ZodSchema<TData>;
  defaultData: TData;
  EditorComponent: React.LazyExoticComponent<React.ComponentType<BlockEditorProps<TData>>> | null;
  ViewerComponent: React.LazyExoticComponent<React.ComponentType<BlockViewerProps<TData>>> | null;
  completionCriteria?: (data: TData) => boolean;
  singleton?: boolean;
  version: number;
  migrate?: (oldData: unknown, fromVersion: number) => TData;
}

const registry = new Map<string, BlockTypeDefinition>();

export function registerBlockType<T>(definition: BlockTypeDefinition<T>): void {
  if (registry.has(definition.type)) {
    console.warn(`[block-registry] Block type "${definition.type}" is already registered. Overwriting.`);
  }
  // Cast required: Map stores erased BlockTypeDefinition; callers must use dataSchema.parse() for type safety
  registry.set(definition.type, definition as unknown as BlockTypeDefinition);
}

export function getBlockType(type: string): BlockTypeDefinition | undefined {
  return registry.get(type);
}

export function getAllBlockTypes(): BlockTypeDefinition[] {
  return Array.from(registry.values());
}

export function getBlockTypesByCategory(category: BlockCategory): BlockTypeDefinition[] {
  return getAllBlockTypes().filter((b) => b.category === category);
}

/** For testing only — clears all registered block types */
export function clearRegistry(): void {
  registry.clear();
}

// Legacy export for backward compat with any code that used LESSON_BLOCK_REGISTRY
export const LESSON_BLOCK_REGISTRY = {
  getAll: getAllBlockTypes,
  get: getBlockType,
};

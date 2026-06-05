import type { ZodType, ZodTypeDef } from 'zod';
import type React from 'react';

export type BlockCategory = 'content' | 'media' | 'interactive' | 'assessment' | 'navigation' | 'layout';

export interface BlockEditorProps<TData = Record<string, unknown>> {
  data: TData;
  block: { id: string; title?: string };
  onChange: (data: TData) => void;
  /** Active slide `settings.block_style` — used by blocks that inherit surface colors */
  slideBlockStyle?: string;
  /** Active editor device preview, mapped to a responsive breakpoint. Defaults to 'desktop'. */
  breakpoint?: 'mobile' | 'tablet' | 'desktop';
}

export interface BlockViewerContext {
  courseId?: string;
  lessonId?: string;
  institutionId?: string;
  previewMode?: boolean;
  /** Slide `settings.block_style` — applied by BlockSurface so viewers skip nested card chrome. */
  blockStyle?: string;
  /** True when rendered inside the editor's editable canvas (not the student/preview viewer).
   *  Blocks that capture pointer events (scratch-reveal, match-pairs drags) should render a
   *  static, non-interactive preview when this is set, to avoid hijacking editor drag/drop. */
  editing?: boolean;
  /** True when this is the ONLY block on its slide — fill-cell blocks grow to fill more
   *  of the slide instead of hugging their (often small) intrinsic content height. */
  soleBlock?: boolean;
  /** Resolved theme cascade (course → institution → branding) for themeable blocks (slider). */
  theme?: { accent: string; sliderAccent: string; chromeAccent: string | null; titleLogoUrl: string | null };
  /** Called by media blocks (e.g. video) when they want the viewer to advance to the next slide. */
  onAutoAdvance?: () => void;
}

export interface BlockViewerProps<TData = Record<string, unknown>> {
  data: TData;
  block: { id: string; title?: string; is_visible: boolean };
  context?: BlockViewerContext;
  onComplete?: () => void;
}

export interface BlockTypeDefinition<TData = Record<string, unknown>> {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: BlockCategory;
  // ZodType with unknown input allows schemas with .default() / .superRefine() where input ≠ output
  dataSchema: ZodType<TData, ZodTypeDef, unknown>;
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

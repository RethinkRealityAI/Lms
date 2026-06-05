import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Institution-wide reusable block templates. Any block editor can save the block's
 * filled-in `data` as a named template, then load it into another block of the same
 * type — on any slide, in any course. Scoped per institution and per `block_type`.
 */
export interface BlockTemplate {
  id: string;
  institution_id: string;
  block_type: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBlockTemplates(
  supabase: SupabaseClient,
  institutionId: string,
  blockType: string,
): Promise<BlockTemplate[]> {
  const { data, error } = await supabase
    .from('block_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('block_type', blockType)
    .order('updated_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as BlockTemplate[];
}

export async function createBlockTemplate(
  supabase: SupabaseClient,
  input: {
    institutionId: string;
    blockType: string;
    name: string;
    description?: string;
    data: Record<string, unknown>;
    createdBy?: string;
  },
): Promise<{ template: BlockTemplate | null; error: string | null }> {
  const { data, error } = await supabase
    .from('block_templates')
    .insert({
      institution_id: input.institutionId,
      block_type: input.blockType,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      data: sanitizeTemplateData(input.data),
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();

  if (error) return { template: null, error: error.message };
  return { template: data as BlockTemplate, error: null };
}

export async function deleteBlockTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('block_templates').delete().eq('id', templateId);
  return { error: error?.message ?? null };
}

/**
 * Layout fields (grid position/size + the sole-block min-height) are properties of a
 * block's PLACE on a slide, not of its content, so they're stripped before saving — a
 * loaded template keeps the target block's own position/size.
 */
export const LAYOUT_KEYS = new Set(['gridX', 'gridY', 'gridW', 'gridH', 'block_min_h', 'contentAlign']);

/** Pull just the layout/position keys out of a block's data (to preserve them on apply). */
export function extractLayout(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of LAYOUT_KEYS) if (data?.[k] !== undefined) out[k] = data[k];
  return out;
}

export function sanitizeTemplateData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (!LAYOUT_KEYS.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Produce the data to apply to a target block. Deep-clones so the template stays
 * pristine, and re-strips any layout keys defensively.
 */
export function applyBlockTemplate(template: BlockTemplate): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(template.data ?? {})) as Record<string, unknown>;
  return sanitizeTemplateData(clone);
}

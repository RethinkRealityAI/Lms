import type { QuizInlineData } from './schema';

export type CategorizeCategory = { name: string; items: string[] };

/** Items the student must sort — union of all category assignments (source of truth). */
export function getCategorizePlayItems(categories: CategorizeCategory[]): string[] {
  return [...new Set(categories.flatMap((c) => c.items.filter(Boolean)))];
}

/**
 * Authoring pool shown in the editor. Uses persisted `options` when set,
 * otherwise derives from category items (legacy blocks).
 */
export function getCategorizeOptionPool(
  data: Pick<QuizInlineData, 'options'>,
  categories: CategorizeCategory[],
): string[] {
  const fromCategories = getCategorizePlayItems(categories);
  // Authoring pool — preserve empty entries so a newly-added (blank) option input
  // renders and can be typed into. (Previously `.filter(Boolean)` here dropped the
  // empty string that "Add Option" appends, so nothing appeared.) The viewer filters
  // empties separately via getCategorizePlayItems.
  const persisted = data.options ?? [];
  if (persisted.length > 0) return persisted;
  return fromCategories;
}

/** Keep `options` in sync with items assigned to categories. */
export function syncCategorizeOptions(categories: CategorizeCategory[]): string[] {
  return getCategorizePlayItems(categories);
}

/** Assign an item to exactly one category (removes from all others). */
export function assignItemToCategory(
  categories: CategorizeCategory[],
  catIndex: number,
  option: string,
  assign: boolean,
): CategorizeCategory[] {
  if (!option) return categories;
  return categories.map((c, i) => {
    let items = c.items.filter((item) => item !== option);
    if (assign && i === catIndex) {
      items = [...items, option];
    }
    return { ...c, items };
  });
}

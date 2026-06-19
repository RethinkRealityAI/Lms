import { cn } from '@/lib/utils';

export type BlockStyleKind = 'glass' | 'glass-dark' | 'classic' | 'none' | string | undefined;

export function resolveBlockStyle(style?: BlockStyleKind): 'glass' | 'glass-dark' | 'classic' | 'none' {
  if (style === 'glass-dark') return 'glass-dark';
  if (style === 'classic') return 'classic';
  if (style === 'none') return 'none';
  return 'glass';
}

export function isDarkSurface(style?: BlockStyleKind): boolean {
  return resolveBlockStyle(style) === 'glass-dark';
}

/** Root layout — flex column with consistent mobile-first spacing */
export const BLOCK_CONTENT_SHELL =
  'h-full w-full min-h-0 flex flex-col gap-4 sm:gap-5';

/** Primary actions pinned to bottom with breathing room above */
export const SURFACE_ACTIONS =
  'mt-auto pt-4 sm:pt-5 shrink-0 flex flex-col gap-3';

export const SURFACE_HEADING =
  'font-bold text-[0.9375rem] sm:text-lg leading-snug text-[color:var(--surface-text)]';

export function surfaceMutedClass(): string {
  return 'text-sm text-[color:var(--surface-text-muted)]';
}

export function surfaceLabelClass(): string {
  return 'text-[11px] font-semibold uppercase tracking-wide text-[color:var(--surface-text-subtle)]';
}

export function surfaceChipClass(extra?: string): string {
  return cn(
    'border text-[color:var(--surface-text)]',
    'bg-[color:var(--surface-chip-bg)] border-[color:var(--surface-chip-border)]',
    'hover:bg-[color:var(--surface-chip-hover)]',
    extra,
  );
}

export function surfaceOptionClass(opts: {
  submitted: boolean;
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  dimmed?: boolean;
}): string {
  const { submitted, isSelected, isCorrect, isWrong, dimmed } = opts;
  return cn(
    'w-full text-left px-3.5 py-3 sm:px-5 sm:py-3.5 rounded-xl border',
    'text-[0.9375rem] sm:text-base leading-snug transition-all duration-150',
    'text-[color:var(--surface-text)]',
    !submitted && !isSelected && surfaceChipClass(),
    !submitted && isSelected &&
      'border-[color:var(--surface-selected-border)] bg-[color:var(--surface-selected-bg)] font-semibold text-[color:var(--surface-selected-text)]',
    isCorrect &&
      'border-green-500/80 bg-green-500/15 font-semibold text-[color:var(--surface-correct-text)]',
    isWrong &&
      'border-red-500/80 bg-red-500/15 font-semibold text-[color:var(--surface-wrong-text)]',
    dimmed && 'opacity-45',
  );
}

export function surfacePoolClass(): string {
  return cn(
    'rounded-xl border min-h-[3rem] p-3',
    'bg-[color:var(--surface-inset-bg)] border-[color:var(--surface-inset-border)]',
  );
}

export function surfaceFeedbackClass(ok: boolean): string {
  return cn(
    'flex items-start gap-2.5 text-sm sm:text-base font-medium rounded-xl px-3.5 py-3 sm:px-5 sm:py-3.5',
    ok
      ? 'bg-green-500/15 border border-green-500/25 text-[color:var(--surface-correct-text)]'
      : 'bg-red-500/15 border border-red-500/25 text-[color:var(--surface-wrong-text)]',
  );
}

export function surfaceInsetClass(): string {
  return cn(
    'text-sm rounded-xl px-3.5 py-3 sm:px-5 sm:py-3.5 border',
    'bg-[color:var(--surface-inset-bg)] border-[color:var(--surface-inset-border)]',
    'text-[color:var(--surface-text-muted)]',
  );
}

export function surfacePrimaryButtonClass(): string {
  return 'w-full min-h-11 sm:min-h-10 sm:w-auto font-semibold bg-[#1E3A5F] hover:bg-[#0F172A] text-white shadow-sm';
}

export function surfaceOutlineButtonClass(): string {
  // NB: this is applied to a shadcn <Button variant="outline">, whose variant sets a
  // solid white `bg-background`. On a dark surface (glass-dark) the surface text token is
  // near-white, so without overriding the background we get white-on-white. Force a
  // transparent background so the glass surface shows through, and pin the hover text
  // color (the variant's `hover:text-accent-foreground` would otherwise flip it).
  return cn(
    'w-full min-h-11 sm:min-h-10 sm:w-auto font-semibold bg-transparent',
    'border-[color:var(--surface-selected-border)] text-[color:var(--surface-selected-text)]',
    'hover:bg-[color:var(--surface-selected-bg)] hover:text-[color:var(--surface-selected-text)]',
  );
}

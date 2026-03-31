import { z } from 'zod';

export const ThemeSchema = z.object({
  primaryColor: z.string().default('#1E3A5F'),
  accentColor: z.string().default('#DC2626'),
  backgroundColor: z.string().default('#FFFFFF'),
  textColor: z.string().default('#0F172A'),
  fontFamily: z.string().default('Inter'),
  fontScale: z.number().min(0.75).max(1.5).default(1),
  logoUrl: z.string().url().optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('md'),
  slideTransition: z.enum(['none', 'fade', 'slide']).default('fade'),
});

export type ResolvedTheme = z.infer<typeof ThemeSchema>;

export const DEFAULT_THEME: ResolvedTheme = ThemeSchema.parse({});

interface ResolveThemeInput {
  institution?: Partial<ResolvedTheme>;
  course?: Partial<ResolvedTheme>;
  slide?: Partial<ResolvedTheme>;
}

export function resolveTheme(input: ResolveThemeInput): ResolvedTheme {
  const merged = {
    ...stripUndefined(input.institution ?? {}),
    ...stripUndefined(input.course ?? {}),
    ...stripUndefined(input.slide ?? {}),
  };
  return ThemeSchema.parse(merged);
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

export function themeToCssVariables(theme: ResolvedTheme): Record<string, string> {
  return {
    '--theme-primary': theme.primaryColor,
    '--theme-accent': theme.accentColor,
    '--theme-bg': theme.backgroundColor,
    '--theme-text': theme.textColor,
    '--theme-font': theme.fontFamily,
    '--theme-font-scale': String(theme.fontScale),
    '--theme-radius': theme.borderRadius,
    '--theme-transition': theme.slideTransition,
  };
}

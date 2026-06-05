export interface TitleSlideSettings {
  title_size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  title_color?: string;
  footer_text?: string;
  footer_logo_url?: string | null;
}

export const TITLE_SIZE_CLASSES: Record<NonNullable<TitleSlideSettings['title_size']>, string> = {
  sm: 'text-xl sm:text-2xl lg:text-3xl',
  md: 'text-2xl sm:text-3xl lg:text-4xl',
  lg: 'text-3xl sm:text-4xl lg:text-5xl',
  xl: 'text-4xl sm:text-5xl lg:text-6xl',
  '2xl': 'text-5xl sm:text-6xl lg:text-7xl',
};

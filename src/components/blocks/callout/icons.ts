import {
  Info, AlertTriangle, AlertCircle, Lightbulb, CheckCircle, HelpCircle, Star, Flag,
  Zap, Bell, BookOpen, Quote, MessageCircle, Heart, Shield, Pin, Sparkles, ThumbsUp,
  Target, Clock, Award, FileText, type LucideIcon,
} from 'lucide-react';
import type { CalloutData } from '@/lib/content/blocks/callout/schema';

/** Curated icon catalog for the callout icon picker. Keys are stored in `data.icon`. */
export const CALLOUT_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'info', Icon: Info },
  { name: 'alert-triangle', Icon: AlertTriangle },
  { name: 'alert-circle', Icon: AlertCircle },
  { name: 'lightbulb', Icon: Lightbulb },
  { name: 'check-circle', Icon: CheckCircle },
  { name: 'help-circle', Icon: HelpCircle },
  { name: 'star', Icon: Star },
  { name: 'flag', Icon: Flag },
  { name: 'zap', Icon: Zap },
  { name: 'bell', Icon: Bell },
  { name: 'book-open', Icon: BookOpen },
  { name: 'quote', Icon: Quote },
  { name: 'message-circle', Icon: MessageCircle },
  { name: 'heart', Icon: Heart },
  { name: 'shield', Icon: Shield },
  { name: 'pin', Icon: Pin },
  { name: 'sparkles', Icon: Sparkles },
  { name: 'thumbs-up', Icon: ThumbsUp },
  { name: 'target', Icon: Target },
  { name: 'clock', Icon: Clock },
  { name: 'award', Icon: Award },
  { name: 'file-text', Icon: FileText },
];

const ICON_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  CALLOUT_ICONS.map((i) => [i.name, i.Icon]),
);

/** The default icon name for each callout variant. */
export const VARIANT_DEFAULT_ICON: Record<NonNullable<CalloutData['variant']>, string> = {
  info: 'info',
  warning: 'alert-triangle',
  tip: 'lightbulb',
  success: 'check-circle',
};

/**
 * Resolve the icon component for a callout. Honors an explicit `data.icon` override
 * (any variant), falls back to the variant default. Returns null when the author
 * chose 'none' (hide the icon).
 */
export function resolveCalloutIcon(data: Pick<CalloutData, 'icon' | 'variant'>): LucideIcon | null {
  if (data.icon === 'none') return null;
  if (data.icon && ICON_BY_NAME[data.icon]) return ICON_BY_NAME[data.icon];
  return ICON_BY_NAME[VARIANT_DEFAULT_ICON[data.variant ?? 'info']] ?? Info;
}
